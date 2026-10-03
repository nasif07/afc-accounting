const { escapeHtml, htmlToPlainText } = require("./richText");

/**
 * HTML bodies for outbound notifications.
 *
 * Written as inline-styled tables rather than a stylesheet on purpose: Outlook
 * and most webmail clients strip <style> blocks and ignore flex/grid, so the
 * only layout primitives that survive everywhere are tables and inline style
 * attributes. This is ugly by web standards and correct by email ones.
 *
 * Every interpolated value is either escaped (escapeHtml) or has already been
 * through sanitizeRichText — the description arrives as author-written HTML and
 * must not be double-escaped, or the director reads tag soup.
 */

// Matches the app shell's --color-brand-navy so the mail is recognisably ours.
const NAVY = "#203C8F";
const NAVY_DARK = "#102050";
const SLATE = "#475569";
const BORDER = "#e2e8f0";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const attachmentRows = (attachments = []) =>
  attachments
    .map(
      (a) => `
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid ${BORDER};font-size:13px;color:${SLATE};">
            ${escapeHtml(a.filename)}
          </td>
          <td style="padding:6px 0;border-bottom:1px solid ${BORDER};font-size:12px;color:#94a3b8;text-align:right;white-space:nowrap;">
            ${Math.max(1, Math.round((a.size || 0) / 1024))} KB
          </td>
        </tr>`,
    )
    .join("");

/**
 * "An accountant needs your sign-off." Sent to a director, either when the
 * request is submitted or later from the Notify action.
 *
 * @param {object}  params.approval    the persisted Approval document
 * @param {object}  params.recipient   { name }
 * @param {object}  params.sender      { name, email } — the requester
 * @param {string}  params.orgName     from Settings, for the header
 * @param {string}  params.reviewUrl   deep link to the request's modal
 * @param {boolean} params.isReminder  changes the subject and opening line
 */
const approvalRequestEmail = ({
  approval,
  recipient,
  sender,
  orgName,
  reviewUrl,
  isReminder = false,
}) => {
  const subject = isReminder
    ? `Reminder: approval needed — ${approval.title}`
    : `Approval required: ${approval.title}`;

  const opening = isReminder
    ? `${escapeHtml(sender.name)} is still waiting on your decision for the request below.`
    : `${escapeHtml(sender.name)} has submitted a request that needs your approval.`;

  const fileCount = approval.attachments?.length ?? 0;

  const html = `
<div style="margin:0;padding:24px 12px;background:#f8fafc;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:${NAVY_DARK};padding:20px 28px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">${escapeHtml(orgName)}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#c7d2fe;">Approval request notification</p>
      </td>
    </tr>

    <tr>
      <td style="padding:28px;">
        <p style="margin:0 0 18px;font-size:14px;color:${SLATE};line-height:1.6;">
          Hello ${escapeHtml(recipient.name || "Director")},<br />${opening}
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${BORDER};border-radius:10px;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0 0 10px;font-size:17px;font-weight:700;color:#0f172a;">
                ${escapeHtml(approval.title)}
              </p>
              <p style="margin:0 0 14px;font-size:12px;color:#94a3b8;">
                ${formatDate(approval.date)} &nbsp;·&nbsp; ${fileCount} attachment${fileCount === 1 ? "" : "s"}
                &nbsp;·&nbsp; submitted by ${escapeHtml(sender.name)}
              </p>

              <!-- Already sanitised on write (richText.js); escaping here would
                   render the author's formatting as literal tags. -->
              <div style="font-size:14px;color:${SLATE};line-height:1.65;border-top:1px solid ${BORDER};padding-top:14px;">
                ${approval.description || ""}
              </div>

              ${
                fileCount > 0
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;">
                       <tr><td colspan="2" style="padding-bottom:6px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#94a3b8;">Attachments</td></tr>
                       ${attachmentRows(approval.attachments)}
                     </table>
                     <p style="margin:10px 0 0;font-size:11px;color:#94a3b8;">
                       Files are not attached to this email — open the request to view them.
                     </p>`
                  : ""
              }
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
          <tr>
            <td style="border-radius:8px;background:${NAVY};">
              <a href="${escapeHtml(reviewUrl)}"
                 style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                Review this request
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;">
          You are receiving this because ${escapeHtml(sender.name)} selected you as an approver.
          Reply to this email to reach them directly.
        </p>
      </td>
    </tr>
  </table>
</div>`;

  const text = [
    `${orgName} — approval request notification`,
    "",
    `Hello ${recipient.name || "Director"},`,
    htmlToPlainText(opening),
    "",
    approval.title,
    `${formatDate(approval.date)} · ${fileCount} attachment${fileCount === 1 ? "" : "s"} · submitted by ${sender.name}`,
    "",
    htmlToPlainText(approval.description),
    "",
    ...(fileCount > 0
      ? ["Attachments:", ...approval.attachments.map((a) => `  - ${a.filename}`), ""]
      : []),
    `Review this request: ${reviewUrl}`,
  ].join("\n");

  return { subject, html, text };
};

/**
 * "Someone asked to reset your password."
 *
 * Deliberately quiet about the account: no role, no confirmation that
 * anything else about the address is known, and nothing that distinguishes a
 * real recipient from a mistyped one. The link is the payload and the expiry
 * is the reassurance.
 */
const passwordResetEmail = ({ recipient, resetUrl, expiresInMinutes, orgName }) => {
  const subject = `Reset your ${orgName} password`;

  const html = `
<div style="margin:0;padding:24px 12px;background:#f8fafc;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:${NAVY_DARK};padding:20px 28px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">${escapeHtml(orgName)}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#c7d2fe;">Password reset</p>
      </td>
    </tr>

    <tr>
      <td style="padding:28px;">
        <p style="margin:0 0 18px;font-size:14px;color:${SLATE};line-height:1.6;">
          Hello ${escapeHtml(recipient.name || "there")},<br />
          We received a request to reset your password. Use the button below to choose a new one.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
          <tr>
            <td style="border-radius:8px;background:${NAVY};">
              <a href="${escapeHtml(resetUrl)}"
                 style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                Choose a new password
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;line-height:1.6;">
          This link expires in ${expiresInMinutes} minutes and can be used once.
        </p>
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
          If you did not ask for this you can ignore this email — your password
          will not change until the link above is used.
        </p>
      </td>
    </tr>
  </table>
</div>`;

  const text = [
    `${orgName} — password reset`,
    "",
    `Hello ${recipient.name || "there"},`,
    "We received a request to reset your password. Open the link below to choose a new one:",
    "",
    resetUrl,
    "",
    `This link expires in ${expiresInMinutes} minutes and can be used once.`,
    "If you did not ask for this, you can ignore this email.",
  ].join("\n");

  return { subject, html, text };
};

module.exports = { approvalRequestEmail, passwordResetEmail };
