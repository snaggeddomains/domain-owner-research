import crypto from 'node:crypto';

const COOKIE = 'dr_auth';

// Cookie value is a hash derived from APP_PASSWORD — not guessable without the
// password, and not the password itself.
function token() {
  return crypto.createHash('sha256').update('dr:' + (process.env.APP_PASSWORD || '')).digest('hex');
}

export function gateEnabled() {
  return Boolean(process.env.APP_PASSWORD);
}

export function checkPassword(pw) {
  return gateEnabled() && typeof pw === 'string' && pw === process.env.APP_PASSWORD;
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
