// Thin Resend wrapper used for password resets and (Phase 3) report-done
// notifications. Uses raw fetch so we don't take on a new dependency.
//
// Env vars:
//   RESEND_API_KEY — required to actually send.
//   EMAIL_FROM     — full From string (e.g. "Snagged Research <noreply@research.snagged.com>").
//                    The domain must be verified in Resend or the send will 403.
//                    Falls back to Resend's sandbox sender (works only for the
//                    Resend account holder's email).

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured()) {
    throw new Error('Email is not configured (set RESEND_API_KEY)');
  }
  const from = (process.env.EMAIL_FROM || 'Snagged Research <onboarding@resend.dev>').trim();
  const body = { from, to: Array.isArray(to) ? to : [to], subject };
  if (html) body.html = html;
  if (text) body.text = text;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail || res.statusText}`);
  }
  return await res.json().catch(() => ({}));
}
