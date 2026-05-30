import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { countUsers, getUser, createUser, findUserByEmail } from './db/users.js';
import { isDbConfigured } from './db/supabase.js';

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'dr_auth';
const SCRYPT_KEYLEN = 64;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Secret used to sign auth cookies. Prefer AUTH_SECRET; fall back to
// APP_PASSWORD (for backward compat with the single-password gate). A token
// signed under one secret is invalid under the other, so rotating secrets
// logs everyone out — which is what you want.
function authSecret() {
  return (process.env.AUTH_SECRET || process.env.APP_PASSWORD || 'dr-fallback-secret').trim();
}

// ── Password hashing (scrypt, no new deps) ──────────────────────────────────
export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const buf = await scrypt(String(pw), salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${buf.toString('hex')}`;
}

export async function verifyPassword(pw, stored) {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const computed = await scrypt(String(pw), salt, expected.length);
  if (expected.length !== computed.length) return false;
  return crypto.timingSafeEqual(expected, computed);
}

// ── Signed token (cookie format: <base64url payload>.<base64url HMAC>) ──────
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', authSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', authSecret()).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function readCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const m = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function setAuthCookie(userId) {
  const payload = { u: String(userId || ''), exp: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE };
  const token = sign(payload);
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearAuthCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// ── Legacy single-password support ──────────────────────────────────────────
// The cookie format used by the old single-password gate was sha256('dr:' + APP_PASSWORD).
// We accept that cookie while the users table is still empty, so the deploy
// of multi-user auth doesn't lock anyone out before the admin seed runs.
function legacyToken() {
  const pw = (process.env.APP_PASSWORD || '').trim();
  if (!pw) return null;
  return crypto.createHash('sha256').update('dr:' + pw).digest('hex');
}

const LEGACY_ADMIN = {
  id: null,
  email: 'legacy-admin',
  is_admin: true,
  permissions: { domain_owner: true, trademark: true, appraisal: true, naming: false },
  email_notify_on_done: false,
};

// ── Public API ─────────────────────────────────────────────────────────────
// Sync — only checks the cookie shape + signature. Used by routes that just
// need a boolean "is anyone here at all" check. Use currentUser() when you
// actually need the user record.
export function isAuthed(req) {
  const raw = readCookie(req, COOKIE);
  if (!raw) return false;
  if (verifyToken(raw)) return true;
  // Legacy fallback (single-password gate).
  const legacy = legacyToken();
  return Boolean(legacy && raw === legacy);
}

// Returns the logged-in user (or null). Loads from Supabase when the cookie
// is a signed token; returns the synthetic legacy-admin when the legacy
// cookie is in use AND the users table is still empty.
export async function currentUser(req) {
  const raw = readCookie(req, COOKIE);
  if (!raw) return null;
  const payload = verifyToken(raw);
  if (payload && payload.u) {
    try {
      return await getUser(payload.u);
    } catch {
      return null;
    }
  }
  // Legacy cookie path — only valid while the users table is empty.
  const legacy = legacyToken();
  if (!legacy || raw !== legacy) return null;
  try {
    if ((await countUsers()) === 0) return LEGACY_ADMIN;
  } catch {
    /* db down — fall through to fail-closed */
  }
  return null;
}

// Permission check on a user record. Admin gets everything; otherwise look up
// the named module in permissions. Permissions are stored as a free-form
// jsonb object so future modules can be added without a schema change.
export function userCan(user, module) {
  if (!user) return false;
  if (user.is_admin) return true;
  const perms = user.permissions || {};
  return Boolean(perms[module]);
}

// ── Admin bootstrap (idempotent, one-shot per process) ──────────────────────
// On first request after deploy, if ADMIN_EMAIL/ADMIN_PASSWORD are set and the
// users table is empty, seed the first admin. After that this is a no-op.
let _seedOnce = null;
export function ensureAdminSeed() {
  if (_seedOnce) return _seedOnce;
  _seedOnce = (async () => {
    if (!isDbConfigured()) return;
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = (process.env.ADMIN_PASSWORD || '').trim();
    if (!email || !password) return;
    try {
      if ((await countUsers()) > 0) return;
      // Defensive: don't insert twice if the seed env vars are set and the user
      // somehow already exists with the same email.
      if (await findUserByEmail(email)) return;
      await createUser({
        email,
        password_hash: await hashPassword(password),
        is_admin: true,
        permissions: { domain_owner: true, trademark: true, appraisal: true, naming: false },
        email_notify_on_done: false,
      });
    } catch (err) {
      console.error('ensureAdminSeed failed:', err && err.message);
    }
  })();
  return _seedOnce;
}

// Public flag — "is there a login gate at all?" — used by /api/me so the
// frontend can decide whether to show the login overlay.
export async function gateEnabled() {
  if (process.env.APP_PASSWORD || process.env.ADMIN_EMAIL) return true;
  try {
    return (await countUsers()) > 0;
  } catch {
    return false;
  }
}
