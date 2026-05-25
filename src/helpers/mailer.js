/**
 * Email helper — sends transactional emails via SMTP (nodemailer).
 * Configure SMTP credentials in .env (see .env.example).
 *
 * Required env vars:
 *   SMTP_HOST     e.g. smtp.gmail.com / smtp.mailgun.org
 *   SMTP_USER     SMTP login username (usually your email address)
 *   SMTP_PASS     SMTP password or app-password
 *
 * Optional env vars:
 *   SMTP_PORT     defaults to 587
 *   SMTP_SECURE   'true' forces TLS (port 465 style); 'false' uses STARTTLS.
 *                 When omitted the port decides: 465 → true, anything else → false.
 *   EMAIL_FROM    e.g. "Saint-Pixels <no-reply@yourdomain.com>"
 *   APP_BASE_URL  e.g. https://yourdomain.com  (used in verification links)
 */

const nodemailer = require('nodemailer');

/**
 * Build a fresh transporter from the current env vars.
 * Never caches null — always retries so a mis-ordered env load doesn't
 * permanently break mail for the process lifetime.
 *
 * @returns {import('nodemailer').Transporter | null}
 */
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  const port   = parseInt(SMTP_PORT || '587', 10);
  // SMTP_SECURE=true → implicit TLS (port 465).
  // SMTP_SECURE=false → STARTTLS (port 587 / 2587).
  // Unset → infer from port number.
  const secure = SMTP_SECURE !== undefined
    ? SMTP_SECURE === 'true'
    : port === 465;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    // requireTLS ensures STARTTLS is negotiated on port 587 even if the
    // server advertises it as optional — prevents accidental plaintext fallback.
    requireTLS: !secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Send an email.
 * Throws on SMTP error so callers can surface the failure to the user.
 * Falls back to console.log if SMTP is not configured (local dev).
 *
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 */
async function sendMail({ to, subject, html, text }) {
  const from        = process.env.EMAIL_FROM || 'Saint-Pixels <no-reply@example.com>';
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback — print to terminal
    console.warn('[mailer] SMTP not configured — email NOT sent, printing to console.');
    console.log(`\n[mailer] ─── EMAIL (dev mode) ────────────────────`);
    console.log(`  From:    ${from}`);
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${text || html}`);
    console.log(`────────────────────────────────────────────────\n`);
    return;
  }

  try {
    const info = await transporter.sendMail({ from, to, subject, html, text });
    console.log(`[mailer] Sent "${subject}" → ${to}  (messageId: ${info.messageId})`);
  } catch (err) {
    console.error(`[mailer] Failed to send "${subject}" → ${to}:`, err.message);
    throw err; // Rethrow so the calling route can return a 500/error to the client
  }
}

/**
 * Send the email-verification message.
 *
 * @param {string} email
 * @param {string} username
 * @param {string} token  - The verification token stored in the DB
 */
async function sendVerificationEmail(email, username, token) {
  const base = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const link = `${base}/api/verify-email?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: email,
    subject: 'Verify your Saint-Pixels account',
    text: `Hi ${username},\n\nClick the link below to verify your email address:\n\n${link}\n\nThe link expires in 24 hours.\n\nIf you did not create a Saint-Pixels account, you can ignore this email.`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:sans-serif;background:#1e1e1f;color:#e2e8f0;padding:32px;">
  <div style="max-width:480px;margin:0 auto;background:#2e2e2f;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.1);">
    <h1 style="margin:0 0 8px;font-size:1.5rem;">Saint-Pixels</h1>
    <p style="color:#94a3b8;margin:0 0 24px;">Verify your email address</p>
    <p>Hi <strong>${username}</strong>,</p>
    <p>Click the button below to confirm your email and activate your account. The link expires in <strong>24 hours</strong>.</p>
    <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#38bdf8;color:#0f172a;font-weight:700;border-radius:10px;text-decoration:none;">Verify Email</a>
    <p style="font-size:0.82rem;color:#64748b;margin-top:24px;">If the button doesn't work, copy this link:<br/><a href="${link}" style="color:#38bdf8;word-break:break-all;">${link}</a></p>
    <p style="font-size:0.82rem;color:#64748b;">If you didn't create a Saint-Pixels account, ignore this email.</p>
  </div>
</body>
</html>`,
  });
}

module.exports = { sendMail, sendVerificationEmail };
