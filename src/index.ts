// Cloudflare Worker for Members Website Backend - TypeScript Version
// Handles authentication, session management, rate limiting, and file operations

// Environment interface for type safety
interface Env {
  MEMBER_PASSWORD: string;
  SESSION_DURATION_HOURS?: string;
  RATE_LIMIT_REQUESTS_PER_MINUTE?: string;
  SESSIONS_KV: KVNamespace;
  FILE_BUCKET: R2Bucket;
  GNMK_MEMBERS_PASSWORD?: string;
}

// Configuration types
interface Config {
  SESSION_DURATION_HOURS: number;
  RATE_LIMIT_REQUESTS_PER_MINUTE: number;
  MAX_SESSION_LIFETIME_HOURS: number;
}

// API types
interface LoginRequest {
  password: string;
}

interface SessionData {
  createdAt: string;
  expiresAt: string;
  ip: string;
}

interface RateLimitData {
  attempts: number[];
}

interface RateLimitResult {
  allowed: boolean;
  resetInMinutes?: number;
}

interface AuthResult {
  valid: boolean;
  sessionData?: SessionData;
  error?: string;
}

interface FileInfo {
  name: string;
  size: number;
  lastModified: string;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  error?: string;
  authenticated?: boolean;
  expiresAt?: string;
}

// Configuration constants
const CONFIG: Config = {
  SESSION_DURATION_HOURS: 24,
  RATE_LIMIT_REQUESTS_PER_MINUTE: 10,
  MAX_SESSION_LIFETIME_HOURS: 168, // 1 week max
};

// CORS headers
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Main worker export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // Route requests
      if (path.startsWith('/api/')) {
        return await handleApiRequest(request, env, path);
      }

      // Not an API request
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },
};

async function handleApiRequest(request: Request, env: Env, path: string): Promise<Response> {
  const segments = path.split('/').filter(Boolean);
  
  if (segments[1] === 'auth') {
    return await handleAuth(request, env, segments[2]);
  } else if (segments[1] === 'files') {
    return await handleFiles(request, env, segments.slice(2));
  }
  
  return jsonResponse({ error: 'Endpoint not found' }, 404);
}

// Authentication handlers
async function handleAuth(request: Request, env: Env, action?: string): Promise<Response> {
  switch (action) {
    case 'login':
      return await handleLogin(request, env);
    case 'logout':
      return await handleLogout(request, env);
    case 'check':
      return await handleAuthCheck(request, env);
    default:
      return jsonResponse({ error: 'Invalid auth action' }, 400);
  }
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  // Rate limiting
  const rateLimitResult = await checkRateLimit(env.SESSIONS_KV, clientIP, env);
  if (!rateLimitResult.allowed) {
    return jsonResponse({ 
      error: `Too many attempts. Try again in ${rateLimitResult.resetInMinutes} minutes.` 
    }, 429);
  }

  try {
    const requestData = await request.json() as LoginRequest;
    const { password } = requestData;
    
    if (!password) {
      return jsonResponse({ error: 'Password is required' }, 400);
    }

    // Check password against environment variable
    if (password !== env.GNMK_MEMBERS_PASSWORD) {
      // Update rate limit on failed attempt
      await updateRateLimit(env.SESSIONS_KV, clientIP);
      return jsonResponse({ error: 'Invalid password' }, 401);
    }

    // Generate session token
    const sessionToken = await generateSessionToken();
    const sessionDuration = parseInt(env.SESSION_DURATION_HOURS || CONFIG.SESSION_DURATION_HOURS.toString());
    const expiresAt = new Date(Date.now() + (sessionDuration * 60 * 60 * 1000));

    // Store session in KV
    const sessionData: SessionData = {
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      ip: clientIP,
    };

    await env.SESSIONS_KV.put(
      `session:${sessionToken}`,
      JSON.stringify(sessionData),
      { expirationTtl: sessionDuration * 3600 }
    );

    // Set cookie
    const response = jsonResponse({ success: true, message: 'Logged in successfully' });
    response.headers.set('Set-Cookie', 
      `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${sessionDuration * 3600}`
    );

    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ error: 'Invalid request data' }, 400);
  }
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const sessionToken = getSessionToken(request);
  
  if (sessionToken) {
    // Remove session from KV
    await env.SESSIONS_KV.delete(`session:${sessionToken}`);
  }

  // Clear cookie
  const response = jsonResponse({ success: true, message: 'Logged out successfully' });
  response.headers.set('Set-Cookie', 
    'session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
  );

  return response;
}

async function handleAuthCheck(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const sessionToken = getSessionToken(request);
  
  if (!sessionToken) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const sessionDataString = await env.SESSIONS_KV.get(`session:${sessionToken}`);
  
  if (!sessionDataString) {
    return jsonResponse({ error: 'Session not found' }, 401);
  }

  const sessionData: SessionData = JSON.parse(sessionDataString);

  // Check if session has expired
  if (new Date() > new Date(sessionData.expiresAt)) {
    await env.SESSIONS_KV.delete(`session:${sessionToken}`);
    return jsonResponse({ error: 'Session expired' }, 401);
  }

  return jsonResponse({ 
    authenticated: true,
    expiresAt: sessionData.expiresAt 
  });
}

// File handlers
async function handleFiles(request: Request, env: Env, pathSegments: string[]): Promise<Response> {
  // Verify authentication first
  const authResult = await verifySession(request, env);
  if (!authResult.valid) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  if (pathSegments.length === 0) {
    // List files
    return await listFiles(request, env);
  } else if (pathSegments.length === 1) {
    // Download specific file
    return await downloadFile(request, env, pathSegments[0]);
  }
  
  return jsonResponse({ error: 'Invalid file request' }, 400);
}

async function listFiles(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const objects = await env.FILE_BUCKET.list();
    
    const files: FileInfo[] = objects.objects.map(obj => ({
      name: obj.key,
      size: obj.size,
      lastModified: obj.uploaded.toISOString(),
    }));

    return jsonResponse(files);
    
  } catch (error) {
    console.error('List files error:', error);
    return jsonResponse({ error: 'Failed to list files' }, 500);
  }
}

async function downloadFile(request: Request, env: Env, filename: string): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const object = await env.FILE_BUCKET.get("2024 Årsmöte GMF.pdf");
    
    if (!object) {
      return jsonResponse({ error: 'File not found' }, 404);
    }

    // Stream the file content
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Length', object.size.toString());
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Add CORS headers
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(object.body, {
      headers,
      status: 200,
    });
    
  } catch (error) {
    console.error('Download file error:', error);
    return jsonResponse({ error: 'Failed to download file' }, 500);
  }
}

// Utility functions
async function verifySession(request: Request, env: Env): Promise<AuthResult> {
  const sessionToken = getSessionToken(request);
  
  if (!sessionToken) {
    return { valid: false, error: 'No session token' };
  }

  const sessionDataString = await env.SESSIONS_KV.get(`session:${sessionToken}`);
  
  if (!sessionDataString) {
    return { valid: false, error: 'Session not found' };
  }

  const sessionData: SessionData = JSON.parse(sessionDataString);

  if (new Date() > new Date(sessionData.expiresAt)) {
    await env.SESSIONS_KV.delete(`session:${sessionToken}`);
    return { valid: false, error: 'Session expired' };
  }

  return { valid: true, sessionData };
}

function getSessionToken(request: Request): string | null {
  // First try Authorization header (for cross-origin requests)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Fallback to cookie (for same-origin requests)
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      acc[name] = value;
    }
    return acc;
  }, {});

  return cookies.session || null;
}

async function generateSessionToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function checkRateLimit(kv: KVNamespace, clientIP: string, env: Env): Promise<RateLimitResult> {
  const rateLimit = parseInt(env.RATE_LIMIT_REQUESTS_PER_MINUTE || CONFIG.RATE_LIMIT_REQUESTS_PER_MINUTE.toString());
  const key = `ratelimit:${clientIP}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  const dataString = await kv.get(key);
  
  if (!dataString) {
    return { allowed: true };
  }

  const data: RateLimitData = JSON.parse(dataString);
  
  // Clean old attempts
  const recentAttempts = data.attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= rateLimit) {
    const oldestAttempt = Math.min(...recentAttempts);
    const resetInMs = windowMs - (now - oldestAttempt);
    const resetInMinutes = Math.ceil(resetInMs / (60 * 1000));
    
    return { 
      allowed: false, 
      resetInMinutes 
    };
  }
  
  return { allowed: true };
}

async function updateRateLimit(kv: KVNamespace, clientIP: string): Promise<void> {
  const key = `ratelimit:${clientIP}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  const dataString = await kv.get(key);
  let attempts: number[] = dataString ? JSON.parse(dataString).attempts : [];
  
  // Clean old attempts and add new one
  attempts = attempts.filter(time => now - time < windowMs);
  attempts.push(now);
  
  const rateLimitData: RateLimitData = { attempts };
  
  await kv.put(key, JSON.stringify(rateLimitData), { 
    expirationTtl: Math.ceil(windowMs / 1000) 
  });
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}