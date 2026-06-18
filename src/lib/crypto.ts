// Portable auth helpers built on Web Crypto, so they run in both the
// Edge middleware and Node route handlers. Intentionally lightweight:
// this pool is for a handful of friends, sign-in just distinguishes accounts.

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function authSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    // Fallback so preview builds work; set AUTH_SECRET in Vercel for stable sessions.
    "us-open-pool-dev-secret-please-set-AUTH_SECRET-env"
  );
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(message: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

export interface SessionPayload {
  uid: number;
  u: string; // username
  iat: number;
  exp: number;
}

export async function createSessionToken(
  user: { uid: number; u: string },
  secret = authSecret(),
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: user.uid,
    u: user.u,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const body = bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = bytesToB64url(await hmac(body, secret));
  return `${body}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  secret = authSecret(),
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = bytesToB64url(await hmac(body, secret));
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// PBKDF2 password hashing (portable, no native deps).
export async function hashPassword(
  password: string,
  saltB64?: string,
): Promise<{ salt: string; hash: string }> {
  const salt = saltB64 ? b64urlToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return { salt: bytesToB64url(salt), hash: bytesToB64url(new Uint8Array(bits)) };
}

export async function verifyPassword(
  password: string,
  saltB64: string,
  hashB64: string,
): Promise<boolean> {
  const { hash } = await hashPassword(password, saltB64);
  return timingSafeEqual(hash, hashB64);
}

export const SESSION_COOKIE = "uo_session";
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
