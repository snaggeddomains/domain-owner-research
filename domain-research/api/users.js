import crypto from 'node:crypto';
import { requireAdmin, hashPassword, signResetToken } from '../lib/auth.js';
import { listUsers, createUser, updateUser, deleteUser, getUser, findUserByEmail } from '../lib/db/users.js';
import { sendEmail, isEmailConfigured } from '../lib/email.js';

// Email a new user a "you've been invited" message containing a password-reset
// link, so they set their own password on first sign-in. Returns true if the
// send was attempted (success or transient failure), false if email isn't
// configured at all. Failures don't block account creation — admins can always
// resend / set a password manually if Resend is down.
async function sendInviteEmail(req, user) {
  if (!isEmailConfigured()) return false;
  const token = signResetToken(user.id);
  const origin = (req.headers['x-forwarded-proto'] ? `${req.headers['x-forwarded-proto']}://` : 'https://') +
    (req.headers['x-forwarded-host'] || req.headers.host || 'research.snagged.com');
  const link = `${origin}/?reset=${encodeURIComponent(token)}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'You\'ve been invited to Snagged Research',
      text:
        `Hey,\n\n` +
        `You've been invited to get access to Snagged Research (${origin}).\n\n` +
        `Click here to set up your password and sign in:\n${link}\n\n` +
        `(This link expires in 1 hour — if it does, ask the admin who invited you to resend it, or use "Forgot password" on the login screen.)`,
      html:
        `<p>Hey,</p>` +
        `<p>You've been invited to get access to <strong>Snagged Research</strong> (<a href="${origin}">${origin}</a>).</p>` +
        `<p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#e48069;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Set up your password</a></p>` +
        `<p style="color:#666;font-size:12px">This link expires in 1 hour. If it does, ask the admin who invited you to resend it, or use "Forgot password" on the login screen.</p>` +
        `<p style="color:#666;font-size:12px">If the button doesn't work, paste this URL: ${link}</p>`,
    });
    return true;
  } catch (err) {
    console.error('user-invite send failed:', err && err.message);
    return true; // we did attempt — surface that to the admin UI as "tried"
  }
}

// Admin-only user CRUD. One endpoint handles all four verbs:
//   GET                 → list users
//   POST    + body{...} → create user (email, password, is_admin?, permissions?, email_notify_on_done?)
//   PATCH   + body{id, ...patch}   → update user
//   DELETE  + body{id} OR ?id=...  → remove user
//
// The PATCH body may include a new `password` (plaintext) which is scrypt-hashed
// before saving. Empty / omitted password leaves the existing hash alone.
export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const method = req.method || 'GET';
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  try {
    if (method === 'GET') {
      const users = await listUsers();
      res.status(200).json({ users });
      return;
    }

    if (method === 'POST') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password.trim() : '';
      if (!email) { res.status(400).json({ error: 'Email is required' }); return; }
      // When the admin leaves password blank, we treat this as an INVITE:
      // create the account with a random throwaway hash and email the user a
      // password-reset link so they set their own password on first sign-in.
      const inviteMode = password.length === 0;
      if (!inviteMode && password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters (leave blank to send an invite email instead)' });
        return;
      }
      const dupe = await findUserByEmail(email);
      if (dupe) { res.status(409).json({ error: 'A user with that email already exists' }); return; }
      // Random 32-byte throwaway hash for invite-mode accounts; the user will
      // overwrite it via the reset-link flow before they can ever sign in.
      const effectivePassword = inviteMode ? crypto.randomBytes(32).toString('hex') : password;
      const user = await createUser({
        email,
        password_hash: await hashPassword(effectivePassword),
        is_admin: Boolean(body.is_admin),
        permissions: sanitizePermissions(body.permissions),
        email_notify_on_done: Boolean(body.email_notify_on_done),
      });
      let inviteSent = false;
      if (inviteMode) {
        inviteSent = await sendInviteEmail(req, user);
      }
      res.status(201).json({
        user: stripHash(user),
        invited: inviteMode,
        invite_sent: inviteSent,
        invite_warning: inviteMode && !inviteSent ? 'Email is not configured (set RESEND_API_KEY) — share the password-reset link manually.' : null,
      });
      return;
    }

    if (method === 'PATCH') {
      const id = body.id;
      if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
      const target = await getUser(id);
      if (!target) { res.status(404).json({ error: 'User not found' }); return; }
      const patch = {};
      if (typeof body.email === 'string') patch.email = body.email.trim().toLowerCase();
      if (typeof body.password === 'string' && body.password.trim().length > 0) {
        if (body.password.trim().length < 8) {
          res.status(400).json({ error: 'Password must be at least 8 characters' });
          return;
        }
        patch.password_hash = await hashPassword(body.password.trim());
      }
      if (body.is_admin !== undefined) {
        // Guard against an admin demoting themselves to a non-admin state when
        // they are the LAST admin in the system — that would lock everyone out
        // of the user-management view.
        if (target.id === admin.id && body.is_admin === false) {
          const users = await listUsers();
          const otherAdmins = users.filter((u) => u.is_admin && u.id !== admin.id).length;
          if (otherAdmins === 0) {
            res.status(400).json({ error: "You're the only admin — promote someone else first" });
            return;
          }
        }
        patch.is_admin = Boolean(body.is_admin);
      }
      if (body.permissions !== undefined) patch.permissions = sanitizePermissions(body.permissions);
      if (body.email_notify_on_done !== undefined) patch.email_notify_on_done = Boolean(body.email_notify_on_done);
      const user = await updateUser(id, patch);
      res.status(200).json({ user: stripHash(user) });
      return;
    }

    if (method === 'DELETE') {
      const id = body.id || req.query.id;
      if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
      if (id === admin.id) {
        res.status(400).json({ error: "You can't delete your own account" });
        return;
      }
      await deleteUser(id);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) });
  }
}

// Whitelist only the keys we expect, coerced to booleans. Free-form jsonb but
// don't trust the client to set arbitrary fields.
function sanitizePermissions(p) {
  // report_shallow / report_deep are sub-permissions of domain_owner — admin
  // can grant free reports, deep reports, or both. Absence in old user rows
  // is treated as "allowed" by userCanReportPhase, but newly-created users
  // get them explicitly set so the admin UI reflects intent.
  const known = ['domain_owner', 'trademark', 'appraisal', 'naming', 'report_shallow', 'report_deep'];
  const out = {};
  if (p && typeof p === 'object') {
    for (const k of known) if (p[k] !== undefined) out[k] = Boolean(p[k]);
  }
  // Sensible default if the client sent nothing: full access for backwards
  // compatibility with how the admin seed user was created.
  if (Object.keys(out).length === 0) {
    return { domain_owner: true, trademark: true, appraisal: true, naming: false, report_shallow: true, report_deep: true };
  }
  return out;
}

function stripHash(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}
