const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

/**
 * SMTP delivery for outbound notifications.
 *
 * Mirrors the shape of r2.service.js: a lazily-built client, an isConfigured()
 * probe so callers can degrade instead of exploding, and no swallowing of real
 * failures. Nothing in the app *requires* mail — a deployment that leaves SMTP
 * unset keeps working, it just cannot notify anyone.
 *
 * Sending is deliberately never fatal to the operation that triggered it. An
 * approval request that was created successfully must not be rolled back
 * because the mail server was briefly unreachable; the caller records what was
 * actually delivered and reports the failures back to the UI.
 */

const REQUIRED_ENV = ["SMTP_HOST", "SMTP_PORT"];

/**
 * The From address.
 *
 * Falls back to SMTP_USER when MAIL_FROM is unset, because that is the only
 * address most providers will accept anyway — Gmail, Zoho and Microsoft 365 all
 * reject a From that is not the authenticated account or one of its verified
 * aliases. Treating MAIL_FROM as mandatory meant a fully working, fully
 * authenticated SMTP setup still sent nothing, and said so only in a log.
 */
const fromAddress = () => process.env.MAIL_FROM || process.env.SMTP_USER || "";

const isConfigured = () =>
  REQUIRED_ENV.every((key) => !!process.env[key]) && !!fromAddress();

const missingEnv = () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  // Reported as the pair, since either one satisfies the requirement.
  if (!fromAddress()) missing.push("MAIL_FROM (or SMTP_USER)");
  return missing;
};

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 is implicit TLS; 587/25 start plaintext and upgrade via STARTTLS.
      // Deriving it from the port rather than asking for a third env var is
      // what every provider's own documentation ends up describing anyway.
      secure:
        process.env.SMTP_SECURE !== undefined
          ? process.env.SMTP_SECURE === "true"
          : port === 465,
      // An unauthenticated relay (a local postfix, MailHog, Mailtrap without
      // credentials) is a legitimate setup — only pass auth when we have it,
      // because an empty user/pass object makes nodemailer attempt AUTH and
      // fail against a server that does not offer it.
      ...(process.env.SMTP_USER && {
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
      // Bounded so a hung mail server cannot hold an API request open.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }

  return transporter;
};

/** Verifies the SMTP connection without sending anything. Used by health checks. */
const verifyConnection = async () => {
  if (!isConfigured()) return { ok: false, reason: `Missing: ${missingEnv().join(", ")}` };
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
};

/**
 * Sends one message. Resolves to { sent, error } rather than throwing, so a
 * caller fanning out to several recipients gets a per-recipient result instead
 * of losing the whole batch to the first failure.
 */
const sendMail = async ({ to, subject, html, text, replyTo }) => {
  if (!isConfigured()) {
    return {
      sent: false,
      error: `Email is not configured on the server. Missing: ${missingEnv().join(", ")}`,
    };
  }

  try {
    const info = await getTransporter().sendMail({
      from: fromAddress(),
      to,
      subject,
      html,
      // Every HTML mail carries a text/plain alternative. Without it, spam
      // filters score the message worse and text-only clients show nothing.
      text,
      ...(replyTo && { replyTo }),
    });

    logger.info({ to, subject, messageId: info.messageId }, "Notification email sent");
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    logger.error({ err: error, to, subject }, "Failed to send notification email");
    return { sent: false, error: error.message };
  }
};

module.exports = {
  isConfigured,
  missingEnv,
  verifyConnection,
  sendMail,
};
