import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/admin/email/preview
// Renders the email preview HTML with the IOPPS branded wrapper.
// Returns the full HTML string that would be sent to recipients.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { subject, emailBody } = body;

    if (!subject && !emailBody) {
      return NextResponse.json(
        { error: "Subject or body is required" },
        { status: 400 }
      );
    }

    const html = renderBrandedEmail(subject || "", emailBody || "");

    return NextResponse.json({ html });
  } catch (err) {
    console.error("Error rendering preview:", err);
    return NextResponse.json(
      { error: "Failed to render preview" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Email template renderer
// ---------------------------------------------------------------------------

function renderBrandedEmail(subject: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #374151;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #D97706;
      padding: 24px;
    }
    .content {
      padding: 24px;
    }
    .footer {
      border-top: 1px solid #f3f4f6;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    .footer a {
      color: #6b7280;
      text-decoration: underline;
    }
    h1, h2, h3 { color: #111827; }
    a { color: #D97706; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);text-align:center;vertical-align:middle;">
            <span style="font-size:18px;font-weight:700;color:#ffffff;">I</span>
          </td>
          <td style="padding-left:12px;">
            <p style="font-size:18px;font-weight:700;color:#ffffff;margin:0;">IOPPS</p>
            <p style="font-size:12px;color:rgba(255,255,255,0.8);margin:2px 0 0;">Indigenous Opportunities Portal</p>
          </td>
        </tr>
      </table>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>IOPPS - Indigenous Opportunities &amp; Professional Partnerships</p>
      <p>You are receiving this because you opted in to communications.</p>
      <p><a href="#">Unsubscribe</a> | <a href="#">Preferences</a></p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
