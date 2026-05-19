import nodemailer from "nodemailer";
import { logger } from "./logger";

export interface EnrollmentNoticeOptions {
  to: string;
  firstName: string;
  lastName: string;
  periodName: string;
  startDate: string;
  endDate: string;
  employerName: string;
}

function getPortalUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(",")[0].trim();
    return `https://${first}`;
  }
  return "https://beneportal.app";
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function buildEnrollmentNoticeHtml(opts: EnrollmentNoticeOptions): string {
  const portalUrl = getPortalUrl();
  const startFormatted = formatDate(opts.startDate);
  const endFormatted = formatDate(opts.endDate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Benefits Enrollment Notice</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F6F4;font-family:'Inter',Arial,sans-serif;color:#4A5568;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8F6F4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#5E0E20;padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">BenePortal</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#FAE0DC;opacity:0.85;">Benefits Enrollment Platform</p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:#9E1E34;color:#ffffff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:99px;letter-spacing:0.5px;text-transform:uppercase;">Open Enrollment</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Banner strip -->
          <tr>
            <td style="background:#9E1E34;height:4px;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:600;color:#5E0E20;line-height:1.3;">
                Time to Review Your Benefits
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#4A5568;line-height:1.6;">
                Dear ${opts.firstName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#4A5568;line-height:1.6;">
                <strong>${opts.employerName}</strong> has opened the <strong>${opts.periodName}</strong> enrollment window. This is your opportunity to enroll in, change, or waive benefit coverage for the upcoming plan year.
              </p>

              <!-- Enrollment window box -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#FAE0DC;border-left:4px solid #9E1E34;border-radius:6px;padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9E1E34;text-transform:uppercase;letter-spacing:0.6px;">Enrollment Window</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#5E0E20;">${startFormatted} &ndash; ${endFormatted}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#4A5568;">All changes must be submitted by the end date.</p>
                  </td>
                </tr>
              </table>

              <!-- What you can do -->
              <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#5E0E20;">During open enrollment, you can:</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
                ${[
                  "Enroll in or switch Medical, Dental, Vision, Life, and Disability plans",
                  "Add or remove dependents (spouse, children, domestic partner)",
                  "Review Summary of Benefits and Coverage (SBC) documents",
                  "Waive coverage if you have other qualifying coverage",
                ].map(item => `
                <tr>
                  <td style="padding:5px 0;">
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="width:20px;vertical-align:top;padding-top:1px;">
                          <span style="display:inline-block;width:8px;height:8px;background:#4A8FA3;border-radius:50%;margin-top:4px;"></span>
                        </td>
                        <td style="font-size:14px;color:#4A5568;line-height:1.5;">${item}</td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join("")}
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" style="display:inline-block;background:#9E1E34;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
                      Access Your Benefits Portal
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:12px;">
                    <p style="margin:0;font-size:12px;color:#4A5568;">
                      If this is your first time logging in, you will be prompted to set up your account password.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:14px;color:#4A5568;line-height:1.6;">
                If you have questions about your benefits options, please contact your HR administrator or benefits broker directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8F6F4;padding:20px 40px;border-top:1px solid #D1CFC7;">
              <p style="margin:0;font-size:12px;color:#4A5568;line-height:1.6;">
                This notice was sent on behalf of <strong>${opts.employerName}</strong> via BenePortal.<br />
                If you did not expect this message, please disregard or contact your HR department.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEnrollmentNoticeText(opts: EnrollmentNoticeOptions): string {
  const portalUrl = getPortalUrl();
  const startFormatted = formatDate(opts.startDate);
  const endFormatted = formatDate(opts.endDate);
  return `BenePortal — Benefits Enrollment Notice

Dear ${opts.firstName} ${opts.lastName},

${opts.employerName} has opened the "${opts.periodName}" enrollment window.

Enrollment Window: ${startFormatted} – ${endFormatted}

During open enrollment you can:
- Enroll in or switch Medical, Dental, Vision, Life, and Disability plans
- Add or remove dependents
- Review Summary of Benefits and Coverage documents
- Waive coverage if you have other qualifying coverage

Access your benefits portal at: ${portalUrl}
If this is your first time logging in, you will be prompted to set up your account password.

Questions? Contact your HR administrator or benefits broker.

This notice was sent on behalf of ${opts.employerName} via BenePortal.
`;
}

function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
}

export async function sendEnrollmentNotice(
  opts: EnrollmentNoticeOptions
): Promise<{ delivered: boolean; simulated: boolean }> {
  const from = process.env.SMTP_FROM || `BenePortal <noreply@beneportal.app>`;

  if (!isSmtpConfigured()) {
    logger.info(
      { to: opts.to, period: opts.periodName },
      "[MAIL SIMULATED] Enrollment notice — SMTP not configured"
    );
    return { delivered: false, simulated: true };
  }

  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from,
      to: opts.to,
      subject: `Action Required: ${opts.periodName} — Enroll in Your Benefits`,
      text: buildEnrollmentNoticeText(opts),
      html: buildEnrollmentNoticeHtml(opts),
    });
    logger.info({ to: opts.to, period: opts.periodName }, "Enrollment notice sent");
    return { delivered: true, simulated: false };
  } catch (err) {
    logger.error({ err, to: opts.to }, "Failed to send enrollment notice email");
    return { delivered: false, simulated: false };
  }
}

export async function sendInvitationEmail(opts: {
  to: string;
  firstName: string;
  lastName: string;
  employerName: string;
}): Promise<{ delivered: boolean; simulated: boolean }> {
  const portalUrl = getPortalUrl();
  const from = process.env.SMTP_FROM || `BenePortal <noreply@beneportal.app>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Benefits Portal Invitation</title></head>
<body style="margin:0;padding:0;background:#F8F6F4;font-family:'Inter',Arial,sans-serif;color:#4A5568;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8F6F4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#5E0E20;padding:28px 40px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">BenePortal</p>
          <p style="margin:4px 0 0;font-size:13px;color:#FAE0DC;opacity:0.85;">Benefits Enrollment Platform</p>
        </td></tr>
        <tr><td style="background:#9E1E34;height:4px;"></td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:22px;font-weight:600;color:#5E0E20;">You've Been Invited</p>
          <p style="margin:0 0 20px;font-size:15px;color:#4A5568;line-height:1.6;">Dear ${opts.firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#4A5568;line-height:1.6;">
            <strong>${opts.employerName}</strong> has invited you to access your benefits through BenePortal. Click below to set up your account and review your available benefit plans.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="${portalUrl}" style="display:inline-block;background:#9E1E34;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
                Set Up My Account
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#4A5568;">If you did not expect this invitation, please contact your HR administrator.</p>
        </td></tr>
        <tr><td style="background:#F8F6F4;padding:20px 40px;border-top:1px solid #D1CFC7;">
          <p style="margin:0;font-size:12px;color:#4A5568;">Sent on behalf of ${opts.employerName} via BenePortal.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `BenePortal Invitation\n\nDear ${opts.firstName} ${opts.lastName},\n\n${opts.employerName} has invited you to access your benefits via BenePortal.\n\nSet up your account at: ${portalUrl}\n\nIf you did not expect this, contact your HR administrator.`;

  if (!isSmtpConfigured()) {
    logger.info({ to: opts.to }, "[MAIL SIMULATED] Invitation — SMTP not configured");
    return { delivered: false, simulated: true };
  }

  try {
    const transporter = createTransport();
    await transporter.sendMail({ from, to: opts.to, subject: `You're Invited to BenePortal`, text, html });
    logger.info({ to: opts.to }, "Invitation email sent");
    return { delivered: true, simulated: false };
  } catch (err) {
    logger.error({ err, to: opts.to }, "Failed to send invitation email");
    return { delivered: false, simulated: false };
  }
}
