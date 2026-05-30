// Combined password-reset endpoint — request (email a reset link) and confirm
// (set the new password) live behind one Vercel function so we stay under the
// Hobby plan's 12-function limit. Routed by the POST body's "action" field.

import { findUserByEmail, getUser, updateUser } from '../lib/db/users.js';
import { signResetToken, verifyResetToken, hashPassword, setAuthCookie } from '../lib/auth.js';
import { sendEmail, isEmailConfigured } from '../lib/email.js';

async function handleRequest(req, res, body) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  // Always return ok=true to avoid leaking which emails exist. The actual
  // send only happens if the user exists and email is configured.
  if (!email) {
    res.status(200).json({ ok: true });
    return;
  }

  let user = null;
  try {
    user = await findUserByEmail(email);
  } catch (err) {
    // DB error — log and still 200 so we don't leak existence either way.
    console.error('password-reset request lookup failed:', err && err.message);
  }

  // Diagnostic logging so the Vercel log makes it obvious WHICH branch fired
  // when an email doesn't arrive. Doesn't leak the address to the client.
  if (!user) console.log(`password-reset request: no user found for ${email}`);
  else if (!isEmailConfigured()) console.log('password-reset request: RESEND_API_KEY not set; skipping send');
  if (user && user.id && isEmailConfigured()) {
    try {
      const token = signResetToken(user.id);
      const origin = (req.headers['x-forwarded-proto'] ? `${req.headers['x-forwarded-proto']}://` : 'https://') +
        (req.headers['x-forwarded-host'] || req.headers.host || 'research.snagged.com');
      const link = `${origin}/?reset=${encodeURIComponent(token)}`;
      console.log(`password-reset request: sending reset link to ${user.email}`);
      await sendEmail({
        to: user.email,
        subject: 'Reset your Snagged Research password',
        text:
          `Someone (probably you) asked to reset the password for your Snagged Research account.\n\n` +
          `Open this link to set a new password (expires in 1 hour):\n${link}\n\n` +
          `If you didn't request this, you can ignore this email — your password is unchanged.`,
        html:
          `<p>Someone (probably you) asked to reset the password for your <strong>Snagged Research</strong> account.</p>` +
          `<p><a href="${link}">Set a new password</a> (this link expires in 1 hour).</p>` +
          `<p>If you didn't request this, you can ignore this email — your password is unchanged.</p>` +
          `<p style="color:#666;font-size:12px">If the button doesn't work, paste this URL: ${link}</p>`,
      });
    } catch (err) {
      console.error('password-reset request send failed:', err && err.message);
    }
  }

  res.status(200).json({ ok: true });
}

async function handleConfirm(req, res, body) {
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';
  if (!token) { res.status(400).json({ error: 'Missing reset token' }); return; }
  if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }

  const parsed = verifyResetToken(token);
  if (!parsed) { res.status(401).json({ error: 'Reset link is invalid or expired — request a new one' }); return; }

  const user = await getUser(parsed.userId);
  if (!user) { res.status(401).json({ error: 'Reset link is invalid or expired — request a new one' }); return; }

  await updateUser(user.id, { password_hash: await hashPassword(password) });
  // Sign the user in immediately after a successful reset.
  res.setHeader('Set-Cookie', setAuthCookie(user.id));
  res.status(200).json({ ok: true, user: { id: user.id, email: user.email, is_admin: Boolean(user.is_admin) } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed — use POST' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const action = typeof body.action === 'string' ? body.action : '';
  if (action === 'request') return handleRequest(req, res, body);
  if (action === 'confirm') return handleConfirm(req, res, body);
  res.status(400).json({ error: 'Missing or unknown "action" (expected "request" or "confirm")' });
}
