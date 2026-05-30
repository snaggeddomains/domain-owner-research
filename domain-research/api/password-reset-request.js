import { findUserByEmail } from '../lib/db/users.js';
import { signResetToken } from '../lib/auth.js';
import { sendEmail, isEmailConfigured } from '../lib/email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed — use POST' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
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
    console.error('password-reset-request lookup failed:', err && err.message);
  }

  if (user && user.id && isEmailConfigured()) {
    try {
      const token = signResetToken(user.id);
      const origin = (req.headers['x-forwarded-proto'] ? `${req.headers['x-forwarded-proto']}://` : 'https://') +
        (req.headers['x-forwarded-host'] || req.headers.host || 'research.snagged.com');
      const link = `${origin}/?reset=${encodeURIComponent(token)}`;
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
      console.error('password-reset-request send failed:', err && err.message);
    }
  }

  res.status(200).json({ ok: true });
}
