// Credential management endpoint — login (default), password-reset request,
// and password-reset confirm all live here so we stay under the Hobby plan's
// 12-function cap. Routed by an optional body "action" field; the bare
// {email,password} body is treated as a login for backwards compatibility.

import { findUserByEmail, getUser, countUsers, updateUser } from '../lib/db/users.js';
import {
  verifyPassword,
  hashPassword,
  setAuthCookie,
  ensureAdminSeed,
  signResetToken,
  verifyResetToken,
} from '../lib/auth.js';
import { sendEmail, isEmailConfigured } from '../lib/email.js';
import crypto from 'node:crypto';

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    is_admin: Boolean(u.is_admin),
    permissions: u.permissions || {},
    email_notify_on_done: Boolean(u.email_notify_on_done),
  };
}

async function handleLogin(req, res, body) {
  // Seed the first admin from env vars if the users table is still empty.
  await ensureAdminSeed();

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  // Trim the password so a stray paste-newline/space can't silently mismatch
  // the hash we stored from the (trimmed) env var on seed.
  const password = typeof body.password === 'string' ? body.password.trim() : '';
  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  // Multi-user path: email + password against the users table.
  if (email) {
    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }
    res.setHeader('Set-Cookie', setAuthCookie(user.id));
    res.status(200).json({ ok: true, user: publicUser(user) });
    return;
  }

  // Legacy single-password path: only valid while no users exist yet (or if
  // the migration hasn't been applied — countUsers throws, we treat it as 0).
  const usersExist = await countUsers().catch(() => 0);
  if (usersExist === 0 && process.env.APP_PASSWORD && password.trim() === process.env.APP_PASSWORD.trim()) {
    const legacy = crypto.createHash('sha256').update('dr:' + process.env.APP_PASSWORD.trim()).digest('hex');
    res.setHeader('Set-Cookie', `dr_auth=${legacy}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
    res.status(200).json({ ok: true, user: { email: 'legacy-admin', is_admin: true } });
    return;
  }

  res.status(401).json({ error: 'Incorrect email or password' });
}

async function handleResetRequest(req, res, body) {
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
      // New-user invites (sent by the admin "Add user" flow) get a 7-day window
      // and invite-flavored copy; self-service resets keep the 1-hour default.
      const invite = body.mode === 'invite';
      const ttlSec = invite ? 60 * 60 * 24 * 7 : undefined;
      const token = signResetToken(user.id, ttlSec);
      // The app is nested at app.snagged.com/research/* — links must include the
      // /research prefix to land on the SPA. Use the NO-trailing-slash form
      // (/research?reset=...): /research/ falls through to "/", which
      // vercel.json 301-redirects (dropping the query) and blanks the link.
      const base = (process.env.APP_URL || 'https://app.snagged.com/research').replace(/\/+$/, '');
      const link = `${base}?reset=${encodeURIComponent(token)}`;
      const email = invite
        ? {
            subject: "You've been invited to join Snagged Admin",
            text:
              `You've been invited to join Snagged Admin.\n\n` +
              `Set your password to activate your account and get started (this link expires in 7 days):\n${link}\n\n` +
              `If you weren't expecting this invitation, you can safely ignore this email.`,
            html:
              `<p>You've been invited to join <strong>Snagged Admin</strong>.</p>` +
              `<p>Set your password to activate your account and get started:</p>` +
              `<p><a href="${link}">Set your password</a> (this link expires in 7 days).</p>` +
              `<p>If you weren't expecting this invitation, you can safely ignore this email.</p>` +
              `<p style="color:#666;font-size:12px">If the button doesn't work, paste this URL: ${link}</p>`,
          }
        : {
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
          };
      console.log(`${invite ? 'invite' : 'password-reset'} request: sending link to ${user.email}`);
      await sendEmail({ to: user.email, ...email });
    } catch (err) {
      console.error('password-reset request send failed:', err && err.message);
    }
  }

  res.status(200).json({ ok: true });
}

async function handleResetConfirm(req, res, body) {
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
  if (action === 'reset-request') return handleResetRequest(req, res, body);
  if (action === 'reset-confirm') return handleResetConfirm(req, res, body);
  // Default (no action, or action === 'login'): the bare {email,password}
  // login flow that already exists.
  return handleLogin(req, res, body);
}
