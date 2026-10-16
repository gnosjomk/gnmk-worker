// Cloudflare Worker - simplified structure
// Auth/session logic preserved, file handling simplified

interface Env {
  GNMK_MEMBERS_PASSWORD: string;
  SESSION_DURATION_HOURS?: string;
  RATE_LIMIT_REQUESTS_PER_MINUTE?: string;
  SESSIONS_KV: KVNamespace;
  FILE_BUCKET: R2Bucket;
  BACKUP_BUCKET: R2Bucket;
  ASSETS: Fetcher;
  // Sveltia CMS - GitHub OAuth
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  CMS_ALLOWED_DOMAINS?: string;
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
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, ETag",
};

// Static assets that only logged-in members may fetch. Each path must also be
// listed in assets.run_worker_first in wrangler.jsonc, or the asset is served
// before the Worker gets a chance to check the session.
const MEMBERS_ONLY_ASSETS = ["/data/member-files.json"];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // Sveltia CMS sign-in. Must be matched before the members-area
      // /api/auth/ handler, which rejects any other sub-path.
      if (path === "/api/auth/github") {
        return handleCmsAuth(request, env);
      }

      if (path === "/api/auth/github/callback") {
        return handleCmsCallback(request, env);
      }

      if (path.startsWith("/api/auth/")) {
        return handleAuth(request, env, path);
      }

      if (path.startsWith("/api/file/")) {
        return handleFileRequest(request, env, path);
      }

      if (MEMBERS_ONLY_ASSETS.includes(path)) {
        return handleMembersOnlyAsset(request, env);
      }

      return new Response("Not Found", { status: 404 });

    } catch (err) {
      console.error(err);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      backupFiles(env).then(result => console.log("R2 backup", result))
    );
  },
};

async function handleMembersOnlyAsset(request: Request, env: Env): Promise<Response> {
  const auth = await verifySession(request, env);
  if (!auth.valid) {
    return jsonResponse({ error: "Not authenticated" }, 401);
  }

  const asset = await env.ASSETS.fetch(request);
  const res = new Response(asset.body, asset);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

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

  let password: unknown;
  try {
    const body = await request.json<{ password?: unknown }>();
    password = body?.password;
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

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

  if (request.method !== "GET" && request.method !== "HEAD") {
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

  // Range support lets the audio player seek in long sermons (Safari will not
  // play audio at all without it). R2 parses the Range header itself.
  const object = request.method === "HEAD"
    ? await env.FILE_BUCKET.head(key)
    : await env.FILE_BUCKET.get(key, { range: request.headers });

  if (!object) {
    return jsonResponse({ error: "File not found" }, 404);
  }

  const headers = new Headers(CORS_HEADERS);

  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType || "application/octet-stream"
  );
  headers.set("Accept-Ranges", "bytes");
  headers.set("ETag", object.httpEtag);
  headers.set(
    "Cache-Control",
    key.startsWith("members/") ? "private, no-store" : "public, max-age=3600"
  );

  const range = request.method === "GET" && request.headers.has("Range")
    ? resolveRange(object.range, object.size)
    : undefined;

  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${object.size}`);
    headers.set("Content-Length", (range.end - range.start + 1).toString());
    return new Response((object as R2ObjectBody).body, { status: 206, headers });
  }

  headers.set("Content-Length", object.size.toString());

  return new Response(request.method === "HEAD" ? null : (object as R2ObjectBody).body, {
    status: 200,
    headers,
  });
}

/** R2 reports the served range in one of three shapes; normalise to bytes. */
function resolveRange(range: R2Range | undefined, size: number) {
  if (!range) return undefined;

  let start: number;
  let length: number;

  if ("suffix" in range && range.suffix !== undefined) {
    length = Math.min(range.suffix, size);
    start = size - length;
  } else {
    start = (range as { offset?: number }).offset ?? 0;
    length = (range as { length?: number }).length ?? size - start;
  }

  return { start, end: Math.min(start + length, size) - 1 };
}

////////////////////////////////////////////////////////
// R2 BACKUP
//
// Nightly one-way copy of FILE_BUCKET into BACKUP_BUCKET. Nothing is ever
// deleted from the backup, so a file deleted by mistake in the CMS can be
// restored. When a file is replaced, the previous backup copy is kept under
// REPLACED_PREFIX/<date>/<key> before the new version is copied in.
//
// Each run copies at most BACKUP_MAX_COPIES files to stay well inside the
// per-invocation limits; anything left over is picked up by the next run.
////////////////////////////////////////////////////////

const REPLACED_PREFIX = "_ersatta/";
const BACKUP_MAX_COPIES = 100;

async function listAll(bucket: R2Bucket, include?: ("customMetadata")[]): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  let cursor: string | undefined;

  do {
    const page = await bucket.list({ cursor, include, limit: 1000 });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return objects;
}

async function copyObject(
  from: R2Bucket,
  fromKey: string,
  to: R2Bucket,
  toKey: string,
  customMetadata: Record<string, string>
): Promise<boolean> {
  const object = await from.get(fromKey);
  if (!object) return false;

  await to.put(toKey, object.body.pipeThrough(new FixedLengthStream(object.size)), {
    httpMetadata: object.httpMetadata,
    customMetadata: { ...object.customMetadata, ...customMetadata },
  });
  return true;
}

export async function backupFiles(env: Pick<Env, "FILE_BUCKET" | "BACKUP_BUCKET">) {
  const [sources, backups] = await Promise.all([
    listAll(env.FILE_BUCKET),
    listAll(env.BACKUP_BUCKET, ["customMetadata"]),
  ]);

  // The source ETag is stored on the copy because a re-uploaded copy can get
  // a different ETag than the original (multipart uploads).
  const backedUp = new Map(
    backups
      .filter(o => !o.key.startsWith(REPLACED_PREFIX))
      .map(o => [o.key, o.customMetadata?.sourceEtag])
  );

  const today = new Date().toISOString().slice(0, 10);
  const result = { copied: 0, replaced: 0, pending: 0 };

  for (const source of sources) {
    const existing = backedUp.get(source.key);
    if (backedUp.has(source.key) && existing === source.etag) continue;

    if (result.copied >= BACKUP_MAX_COPIES) {
      result.pending++;
      continue;
    }

    if (backedUp.has(source.key)) {
      await copyObject(
        env.BACKUP_BUCKET, source.key,
        env.BACKUP_BUCKET, `${REPLACED_PREFIX}${today}/${source.key}`,
        {}
      );
      result.replaced++;
    }

    if (await copyObject(env.FILE_BUCKET, source.key, env.BACKUP_BUCKET, source.key, { sourceEtag: source.etag })) {
      result.copied++;
    }
  }

  return result;
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
// SVELTIA CMS - GITHUB OAUTH
//
// Authorization Code Flow. Mirrors the postMessage protocol that Sveltia CMS
// expects; see https://github.com/sveltia/sveltia-cms-auth
//
//   1. popup  -> opener   "authorizing:github"
//   2. opener -> popup    "authorizing:github"
//   3. popup  -> opener   "authorization:github:success:{json}"
//
// The CMS discards any message whose origin differs from the origin of
// backend.base_url, so both routes must live on the site's own domain.
////////////////////////////////////////////////////////

const CMS_PROVIDER = "github";
const CMS_ALLOWED_SCOPES = ["repo", "public_repo", "user", "read:user", "user:email"];
const CMS_DEFAULT_SCOPE = "repo,user";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "gnosjomk.se,*.workers.dev" -> ["^gnosjomk\.se$", "^.+\.workers\.dev$"] */
function cmsDomainPatterns(allowed?: string): string[] {
  return (allowed || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => `^${escapeRegExp(s).replaceAll("\\*", ".+")}$`);
}

function cmsScope(requested?: string | null): string {
  const scopes = (requested || "").split(/[\s,]+/).filter(Boolean);
  if (!scopes.length) return CMS_DEFAULT_SCOPE;
  if (scopes.every(s => CMS_ALLOWED_SCOPES.includes(s))) return scopes.join(",");
  return CMS_DEFAULT_SCOPE;
}

/**
 * The HTML page returned into the popup. It completes the handshake, then
 * hands the token (or the error) to the CMS window that opened it.
 */
function cmsResultPage(args: {
  token?: string;
  error?: string;
  errorCode?: string;
  allowedDomains?: string;
}): Response {
  const { token, error, errorCode, allowedDomains } = args;
  const state = error ? "error" : "success";
  const content = error
    ? { provider: CMS_PROVIDER, error, errorCode }
    : { provider: CMS_PROVIDER, token };

  // Escaped so neither value can close the inline <script> element.
  const payload = JSON.stringify(JSON.stringify(content)).replaceAll("<", "\\u003c");
  const patterns = JSON.stringify(cmsDomainPatterns(allowedDomains)).replaceAll("<", "\\u003c");

  const html = `<!doctype html><html lang="sv"><body><script>
  (function () {
    var patterns = ${patterns};
    var hasToken = ${token ? "true" : "false"};

    function trusted(origin) {
      try {
        var host = new URL(origin).hostname;
        return patterns.some(function (p) { return new RegExp(p).test(host); });
      } catch (e) { return false; }
    }

    window.addEventListener("message", function (event) {
      if (event.data !== "authorizing:${CMS_PROVIDER}") return;
      // event.origin is set by the browser and cannot be forged by the opener.
      if (hasToken && patterns.length && !trusted(event.origin)) return;
      window.opener.postMessage(
        "authorization:${CMS_PROVIDER}:${state}:" + ${payload},
        event.origin
      );
    });

    window.opener.postMessage("authorizing:${CMS_PROVIDER}", "*");
  })();
  </script></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "no-store",
      "Set-Cookie": "csrf-token=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure",
    },
  });
}

/** Step 1: send the popup on to GitHub's consent screen. */
async function handleCmsAuth(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const allowedDomains = env.CMS_ALLOWED_DOMAINS;
  const patterns = cmsDomainPatterns(allowedDomains);
  const siteId = url.searchParams.get("site_id") || "";

  if (patterns.length && !patterns.some(p => new RegExp(p).test(siteId))) {
    return cmsResultPage({
      error: "Your domain is not allowed to use the authenticator.",
      errorCode: "UNSUPPORTED_DOMAIN",
      allowedDomains,
    });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return cmsResultPage({
      error: "OAuth app client ID or secret is not configured.",
      errorCode: "MISCONFIGURED_CLIENT",
      allowedDomains,
    });
  }

  const csrfToken = crypto.randomUUID().replaceAll("-", "");

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}/api/auth/github/callback`,
    scope: cmsScope(url.searchParams.get("scope")),
    state: csrfToken,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      "Set-Cookie":
        `csrf-token=${CMS_PROVIDER}_${csrfToken}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    },
  });
}

/** Step 2: exchange the code for a token and hand it back to the CMS. */
async function handleCmsCallback(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const allowedDomains = env.CMS_ALLOWED_DOMAINS;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieMatch = (request.headers.get("Cookie") || "")
    .match(/\bcsrf-token=([a-z-]+?)_([0-9a-f]{32})\b/);
  const provider = cookieMatch ? cookieMatch[1] : undefined;
  const csrfToken = cookieMatch ? cookieMatch[2] : undefined;

  if (provider !== CMS_PROVIDER) {
    return cmsResultPage({
      error: "Your Git backend is not supported by the authenticator.",
      errorCode: "UNSUPPORTED_BACKEND",
      allowedDomains,
    });
  }

  if (!code || !state) {
    return cmsResultPage({
      error: "Failed to receive an authorization code. Please try again later.",
      errorCode: "AUTH_CODE_REQUEST_FAILED",
      allowedDomains,
    });
  }

  if (!csrfToken || state !== csrfToken) {
    return cmsResultPage({
      error: "Potential CSRF attack detected. Authentication flow aborted.",
      errorCode: "CSRF_DETECTED",
      allowedDomains,
    });
  }

  let response: Response | undefined;

  try {
    response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "gnmk-worker",
      },
      // No redirect_uri here, deliberately. GitHub validates it at the
      // /authorize step against the registered callback URL; repeating it at
      // the token step only adds a second exact-string comparison that fails
      // if the request arrives on a different host (apex vs www, workers.dev).
      body: JSON.stringify({
        code,
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
      }),
    });
  } catch (err) {
    console.error(err);
  }

  if (!response) {
    return cmsResultPage({
      error: "Failed to request an access token. Please try again later.",
      errorCode: "TOKEN_REQUEST_FAILED",
      allowedDomains,
    });
  }

  let token: string | undefined;
  let error: string | undefined;

  try {
    const data = await response.json() as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    token = data.access_token;
    error = data.error_description || data.error;

    if (!token) {
      // Sveltia shows a generic localised message keyed on errorCode, so the
      // only place GitHub's actual reason is visible is the Worker log.
      // Watch it with: npx wrangler tail
      console.error("GitHub token exchange failed", {
        status: response.status,
        error: data.error,
        error_description: data.error_description,
      });
    }
  } catch (err) {
    console.error("GitHub token response was not JSON", err);
    return cmsResultPage({
      error: "Server responded with malformed data. Please try again later.",
      errorCode: "MALFORMED_RESPONSE",
      allowedDomains,
    });
  }

  if (!token) {
    return cmsResultPage({
      error: error || "Failed to retrieve an access token.",
      errorCode: "TOKEN_REQUEST_FAILED",
      allowedDomains,
    });
  }

  return cmsResultPage({ token, allowedDomains });
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