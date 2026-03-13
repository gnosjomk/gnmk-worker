// Cloudflare Worker - simplified structure
// Auth/session logic preserved, file handling simplified

interface Env {
  GNMK_MEMBERS_PASSWORD: string;
  SESSION_DURATION_HOURS?: string;
  RATE_LIMIT_REQUESTS_PER_MINUTE?: string;
  SESSIONS_KV: KVNamespace;
  FILE_BUCKET: R2Bucket;
}

interface SessionData {
  createdAt: string;
  expiresAt: string;
  ip: string;
}

interface RateLimitData {
  attempts: number[];
}

const CONFIG = {
  SESSION_DURATION_HOURS: 24,
  RATE_LIMIT_REQUESTS_PER_MINUTE: 10,
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
      }

      const url = new URL(request.url);
      const path = url.pathname;

      if (path.startsWith("/api/auth/")) {
        return handleAuth(request, env, path);
      }

      if (path.startsWith("/api/file/")) {
        return handleFileRequest(request, env, path);
      }

      return new Response("Not Found", { status: 404 });

    } catch (err) {
      console.error(err);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },
};

////////////////////////////////////////////////////////
// AUTH
////////////////////////////////////////////////////////

async function handleAuth(request: Request, env: Env, path: string): Promise<Response> {
  if (path.endsWith("/login")) return login(request, env);
  if (path.endsWith("/logout")) return logout(request, env);
  if (path.endsWith("/check")) return authCheck(request, env);

  return jsonResponse({ error: "Invalid auth endpoint" }, 400);
}

async function login(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";

  const rateLimit = await checkRateLimit(env.SESSIONS_KV, clientIP, env);
  if (!rateLimit.allowed) {
    return jsonResponse(
      { error: `Too many attempts. Try again in ${rateLimit.resetInMinutes} minutes.` },
      429
    );
  }

  const body = await request.json();
  const password = body.password;

  if (password !== env.GNMK_MEMBERS_PASSWORD) {
    await updateRateLimit(env.SESSIONS_KV, clientIP);
    return jsonResponse({ error: "Invalid password" }, 401);
  }

  const token = await generateSessionToken();

  const duration =
    parseInt(env.SESSION_DURATION_HOURS || CONFIG.SESSION_DURATION_HOURS.toString());

  const expiresAt = new Date(Date.now() + duration * 3600 * 1000);

  const session: SessionData = {
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    ip: clientIP,
  };

  await env.SESSIONS_KV.put(
    `session:${token}`,
    JSON.stringify(session),
    { expirationTtl: duration * 3600 }
  );

  const res = jsonResponse({ success: true });

  res.headers.set(
    "Set-Cookie",
    `session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${duration * 3600}`
  );

  return res;
}

async function logout(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const token = getSessionToken(request);

  if (token) {
    await env.SESSIONS_KV.delete(`session:${token}`);
  }

  const res = jsonResponse({ success: true });

  res.headers.set(
    "Set-Cookie",
    "session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
  );

  return res;
}

async function authCheck(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const result = await verifySession(request, env);

  if (!result.valid) {
    return jsonResponse({ error: "Not authenticated" }, 401);
  }

  return jsonResponse({
    authenticated: true,
    expiresAt: result.sessionData!.expiresAt,
  });
}

////////////////////////////////////////////////////////
// FILE ACCESS
////////////////////////////////////////////////////////

async function handleFileRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const key = decodeURIComponent(path.replace("/api/file/", ""));

  if (!key.startsWith("public/") && !key.startsWith("members/")) {
    return jsonResponse({ error: "Invalid file path" }, 403);
  }

  if (key.startsWith("members/")) {
    const auth = await verifySession(request, env);
    if (!auth.valid) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
  }

  const object = await env.FILE_BUCKET.get(key);

  if (!object) {
    return jsonResponse({ error: "File not found" }, 404);
  }

  const headers = new Headers(CORS_HEADERS);

  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType || "application/octet-stream"
  );

  headers.set("Content-Length", object.size.toString());

  return new Response(object.body, {
    status: 200,
    headers,
  });
}

////////////////////////////////////////////////////////
// SESSION UTILS
////////////////////////////////////////////////////////

async function verifySession(request: Request, env: Env) {
  const token = getSessionToken(request);
  if (!token) return { valid: false };

  const data = await env.SESSIONS_KV.get(`session:${token}`);
  if (!data) return { valid: false };

  const session: SessionData = JSON.parse(data);

  if (new Date() > new Date(session.expiresAt)) {
    await env.SESSIONS_KV.delete(`session:${token}`);
    return { valid: false };
  }

  return { valid: true, sessionData: session };
}

function getSessionToken(request: Request): string | null {

  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;

  for (const part of cookie.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === "session") return v;
  }

  return null;
}

async function generateSessionToken(): Promise<string> {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return [...arr].map(b => b.toString(16).padStart(2, "0")).join("");
}

////////////////////////////////////////////////////////
// RATE LIMIT
////////////////////////////////////////////////////////

async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  env: Env
) {
  const limit =
    parseInt(env.RATE_LIMIT_REQUESTS_PER_MINUTE || CONFIG.RATE_LIMIT_REQUESTS_PER_MINUTE.toString());

  const key = `ratelimit:${ip}`;
  const now = Date.now();
  const window = 60000;

  const data = await kv.get(key);
  if (!data) return { allowed: true };

  const parsed: RateLimitData = JSON.parse(data);
  const recent = parsed.attempts.filter(t => now - t < window);

  if (recent.length >= limit) {
    const oldest = Math.min(...recent);
    const reset = Math.ceil((window - (now - oldest)) / 60000);
    return { allowed: false, resetInMinutes: reset };
  }

  return { allowed: true };
}

async function updateRateLimit(kv: KVNamespace, ip: string) {
  const key = `ratelimit:${ip}`;
  const now = Date.now();
  const window = 60000;

  const data = await kv.get(key);
  let attempts: number[] = data ? JSON.parse(data).attempts : [];

  attempts = attempts.filter(t => now - t < window);
  attempts.push(now);

  await kv.put(
    key,
    JSON.stringify({ attempts }),
    { expirationTtl: 60 }
  );
}

////////////////////////////////////////////////////////
// RESPONSE
////////////////////////////////////////////////////////

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}