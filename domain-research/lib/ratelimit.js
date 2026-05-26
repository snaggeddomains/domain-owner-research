import { kv } from '@vercel/kv';

// Fixed-window limiter backed by Vercel KV. Configurable via env:
//   RATE_LIMIT_MAX         requests allowed per window (default 20)
//   RATE_LIMIT_WINDOW_SEC  window length in seconds   (default 3600 = 1h)
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX || 20);
const WINDOW_SEC = Number(process.env.RATE_LIMIT_WINDOW_SEC || 3600);

// Vercel KV reads these automatically; if they're absent (e.g. local `vercel
// dev` without a KV store) we fail open rather than crash, so the free
// sources still work locally. In production with KV configured, the limit is
// enforced — set the env vars before exposing the endpoint publicly.
function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function checkRateLimit(identifier) {
  if (!kvConfigured()) {
    return { allowed: true, remaining: MAX_REQUESTS, retryAfter: 0, enforced: false };
  }

  const key = `ratelimit:research:${identifier}`;
  const count = await kv.incr(key);
  if (count === 1) {
    await kv.expire(key, WINDOW_SEC);
  }

  if (count > MAX_REQUESTS) {
    const ttl = await kv.ttl(key);
    return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : WINDOW_SEC, enforced: true };
  }

  return { allowed: true, remaining: MAX_REQUESTS - count, retryAfter: 0, enforced: true };
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}
