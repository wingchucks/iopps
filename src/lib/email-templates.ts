/**
 * Email template functions that return responsive HTML strings
 * with IOPPS brand colors (navy #0F2B4C, teal #0D9488).
 */

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
<!-- Header -->
<tr>
<td style="background:#0F2B4C;padding:24px 32px;text-align:center;">
  <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">IOPPS</span>
</td>
</tr>
<!-- Body -->
<tr>
<td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.6;">
${body}
</td>
</tr>
<!-- Footer -->
<tr>
<td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;line-height:1.5;">
  Indigenous Opportunity Portal &amp; Partnerships System<br/>
  <a href="https://www.iopps.ca" style="color:#0D9488;text-decoration:none;">www.iopps.ca</a>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function btn(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="background:#0D9488;border-radius:8px;">
  <a href="${url}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${text}</a>
</td></tr>
</table>`;
}

export function welcomeEmail(name: string): string {
  return layout(
    "Welcome to IOPPS",
    `<h2 style="margin:0 0 16px;font-size:20px;color:#0F2B4C;">Welcome, ${name}!</h2>
<p style="margin:0 0 12px;">Thank you for joining the Indigenous Opportunity Portal &amp; Partnerships System. We are excited to have you as part of our community.</p>
<p style="margin:0 0 12px;">Here is what you can do next:</p>
<ul style="margin:0 0 12px;padding-left:20px;color:#374151;">
  <li>Complete your profile to get personalized job matches</li>
  <li>Browse opportunities from partner organizations</li>
  <li>Connect with community members</li>
</ul>
${btn("Explore Opportunities", "https://www.iopps.ca/discover")}
<p style="margin:0;color:#6b7280;font-size:13px;">If you have any questions, feel free to reach out to our team.</p>`
  );
}

export function applicationStatusEmail(
  name: string,
  jobTitle: string,
  status: string
): string {
  const statusLabel: Record<string, string> = {
    reviewing: "is now being reviewed",
    shortlisted: "has been shortlisted",
    interview: "has moved to the interview stage",
    offered: "has received an offer",
    rejected: "was not selected to move forward",
  };
  const message = statusLabel[status] || `has been updated to "${status}"`;

  return layout(
    "Application Status Update",
    `<h2 style="margin:0 0 16px;font-size:20px;color:#0F2B4C;">Application Update</h2>
<p style="margin:0 0 12px;">Hi ${name},</p>
<p style="margin:0 0 12px;">Your application for <strong>${jobTitle}</strong> ${message}.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
<tr><td style="background:#f0fdfa;border-left:4px solid #0D9488;padding:12px 16px;border-radius:0 8px 8px 0;">
  <span style="font-size:13px;color:#0D9488;font-weight:600;">Status: ${status.charAt(0).toUpperCase() + status.slice(1)}</span>
</td></tr>
</table>
${btn("View Application", "https://www.iopps.ca/member/applications")}
<p style="margin:0;color:#6b7280;font-size:13px;">Good luck with your application!</p>`
  );
}

export function newMessageEmail(name: string, senderName: string): string {
  return layout(
    "New Message on IOPPS",
    `<h2 style="margin:0 0 16px;font-size:20px;color:#0F2B4C;">New Message</h2>
<p style="margin:0 0 12px;">Hi ${name},</p>
<p style="margin:0 0 12px;">You have received a new message from <strong>${senderName}</strong> on IOPPS.</p>
${btn("Read Message", "https://www.iopps.ca/member/messages")}
<p style="margin:0;color:#6b7280;font-size:13px;">You are receiving this because you have message notifications enabled.</p>`
  );
}

export function eventReminderEmail(
  name: string,
  eventTitle: string,
  eventDate: string
): string {
  return layout(
    "Event Reminder",
    `<h2 style="margin:0 0 16px;font-size:20px;color:#0F2B4C;">Event Reminder</h2>
<p style="margin:0 0 12px;">Hi ${name},</p>
<p style="margin:0 0 12px;">This is a reminder that <strong>${eventTitle}</strong> is coming up on <strong>${eventDate}</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
<tr><td style="background:#f0fdfa;border-left:4px solid #0D9488;padding:12px 16px;border-radius:0 8px 8px 0;">
  <span style="font-size:14px;color:#0F2B4C;font-weight:600;">${eventTitle}</span><br/>
  <span style="font-size:13px;color:#6b7280;">${eventDate}</span>
</td></tr>
</table>
${btn("View Event", "https://www.iopps.ca/discover")}
<p style="margin:0;color:#6b7280;font-size:13px;">We look forward to seeing you there!</p>`
  );
}

export function jobMatchEmail(
  name: string,
  jobTitle: string,
  orgName: string
): string {
  return layout(
    "New Job Match",
    `<h2 style="margin:0 0 16px;font-size:20px;color:#0F2B4C;">New Job Match</h2>
<p style="margin:0 0 12px;">Hi ${name},</p>
<p style="margin:0 0 12px;">A new opportunity matching your profile has been posted:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
<tr><td style="background:#f0fdfa;border:1px solid #ccfbf1;padding:16px;border-radius:8px;">
  <span style="font-size:16px;color:#0F2B4C;font-weight:700;">${jobTitle}</span><br/>
  <span style="font-size:13px;color:#6b7280;">at ${orgName}</span>
</td></tr>
</table>
${btn("View Opportunity", "https://www.iopps.ca/discover")}
<p style="margin:0;color:#6b7280;font-size:13px;">Keep your profile updated to get the best matches.</p>`
  );
}
