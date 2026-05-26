import crypto from 'node:crypto';

const COOKIE = 'dr_auth';

// Trimmed so a stray space/newline pasted into the env var (a common dashboard
// footgun) can't silently break login.
function appPassword() {
  return (process.env.APP_PASSWORD || '').trim();
}

// Cookie value is a hash derived from APP_PASSWORD — not guessable without the
// password, and not the password itself.
function token() {
  return crypto.createHash('sha256').update('dr:' + appPassword()).digest('hex');
}

export function gateEnabled() {
  return Boolean(appPassword());
}

export function checkPassword(pw) {
  return gateEnabled() && typeof pw === 'string' && pw.trim() === appPassword();
}

export function authCookie() {
  // 7 days; Secure + HttpOnly + SameSite=Lax.
  return `${COOKIE}=${token()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
}

export function isAuthed(req) {
  if (!gateEnabled()) return true; // no password configured → open (set APP_PASSWORD to gate)
  const cookies = req.headers.cookie || '';
  const m = cookies.match(/(?:^|;\s*)dr_auth=([a-f0-9]+)/);
  return Boolean(m && m[1] === token());
}
