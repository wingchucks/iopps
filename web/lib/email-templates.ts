/**
 * Email Templates for IOPPS
 * Styled email templates with dark theme and mobile-responsive design
 */

// Types for email templates
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type: string;
}

type ApplicationStatus = 'submitted' | 'viewed' | 'interview' | 'rejected' | 'accepted';

// Base email wrapper with consistent styling
function emailWrapper(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${title}</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; padding: 10px !important; }
          .content { padding: 20px !important; }
          .button { width: 100% !important; padding: 14px 20px !important; }
          h1 { font-size: 24px !important; }
          h2 { font-size: 20px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0F172A; color: #E2E8F0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0F172A;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);">
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 40px 30px 30px; background: linear-gradient(135deg, #1E293B 0%, #334155 100%); border-bottom: 2px solid #14B8A6;">
                  <img src="https://your-domain.com/logo.png" alt="IOPPS Logo" width="150" style="display: block; max-width: 150px; height: auto;" />
                  <h1 style="margin: 20px 0 0; font-size: 28px; font-weight: 700; color: #F1F5F9; line-height: 1.3;">${title}</h1>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td class="content" style="padding: 30px;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #0F172A; border-top: 1px solid #334155; text-align: center;">
                  <p style="margin: 0 0 15px; font-size: 14px; color: #94A3B8; line-height: 1.6;">
                    IOPPS - Connecting Talent with Opportunity
                  </p>
                  <p style="margin: 0 0 15px; font-size: 12px; color: #64748B;">
                    <a href="https://your-domain.com" style="color: #14B8A6; text-decoration: none; margin: 0 10px;">Home</a>
                    <span style="color: #475569;">|</span>
                    <a href="https://your-domain.com/jobs" style="color: #14B8A6; text-decoration: none; margin: 0 10px;">Browse Jobs</a>
                    <span style="color: #475569;">|</span>
                    <a href="https://your-domain.com/help" style="color: #14B8A6; text-decoration: none; margin: 0 10px;">Help</a>
                  </p>
                  <p style="margin: 15px 0 0; font-size: 11px; color: #64748B;">
                    <a href="{{UNSUBSCRIBE_LINK}}" style="color: #64748B; text-decoration: underline;">Unsubscribe from these emails</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Button component
function button(text: string, href: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${href}" class="button" style="display: inline-block; background-color: #14B8A6; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 8px; transition: background-color 0.3s ease;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// 1. Welcome Email
export function welcomeEmail(userName: string): string {
  const content = `
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      Hi <strong style="color: #14B8A6;">${userName}</strong>,
    </p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      Welcome to IOPPS! We're excited to have you join our community of job seekers and employers.
    </p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      IOPPS is your gateway to discovering amazing career opportunities and connecting with top talent. Here's what you can do:
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="padding: 15px; background-color: #334155; border-radius: 8px; border-left: 4px solid #14B8A6; margin-bottom: 10px;">
          <p style="margin: 0; font-size: 15px; color: #F1F5F9; line-height: 1.5;">
            <strong style="color: #14B8A6;">Browse Jobs:</strong> Explore thousands of job listings
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 15px; background-color: #334155; border-radius: 8px; border-left: 4px solid #14B8A6; margin-bottom: 10px;">
          <p style="margin: 0; font-size: 15px; color: #F1F5F9; line-height: 1.5;">
            <strong style="color: #14B8A6;">Set Job Alerts:</strong> Get notified about relevant opportunities
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 15px; background-color: #334155; border-radius: 8px; border-left: 4px solid #14B8A6;">
          <p style="margin: 0; font-size: 15px; color: #F1F5F9; line-height: 1.5;">
            <strong style="color: #14B8A6;">Complete Your Profile:</strong> Stand out to employers
          </p>
        </td>
      </tr>
    </table>
    ${button('Get Started', 'https://your-domain.com/dashboard')}
    <p style="margin: 20px 0 0; font-size: 14px; color: #94A3B8; line-height: 1.6;">
      If you have any questions, our support team is here to help!
    </p>
  `;

  return emailWrapper(content, 'Welcome to IOPPS!');
}

// 2. Job Alert Email
export function jobAlertEmail(jobs: Job[], userName: string): string {
  const jobItems = jobs.map(job => `
    <tr>
      <td style="padding: 20px; background-color: #334155; border-radius: 8px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px; font-size: 18px; font-weight: 600; color: #14B8A6;">
          ${job.title}
        </h3>
        <p style="margin: 0 0 8px; font-size: 15px; color: #F1F5F9;">
          <strong>${job.company}</strong>
        </p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #94A3B8;">
          <span style="margin-right: 15px;">📍 ${job.location}</span>
          <span style="margin-right: 15px;">💼 ${job.type}</span>
          ${job.salary ? `<span>💰 ${job.salary}</span>` : ''}
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 15px;">
          <tr>
            <td>
              <a href="https://your-domain.com/jobs/${job.id}" style="display: inline-block; background-color: #0F172A; color: #14B8A6; font-weight: 600; font-size: 14px; text-decoration: none; padding: 10px 20px; border-radius: 6px; border: 1px solid #14B8A6;">
                View Details
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height: 15px;"></td></tr>
  `).join('');

  const content = `
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      Hi <strong style="color: #14B8A6;">${userName}</strong>,
    </p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      We found <strong style="color: #14B8A6;">${jobs.length}</strong> new ${jobs.length === 1 ? 'job' : 'jobs'} that match your preferences:
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      ${jobItems}
    </table>
    ${button('View All Jobs', 'https://your-domain.com/jobs')}
    <p style="margin: 20px 0 0; font-size: 14px; color: #94A3B8; line-height: 1.6;">
      Want to adjust your job alert preferences? <a href="https://your-domain.com/settings/alerts" style="color: #14B8A6; text-decoration: underline;">Update your settings</a>
    </p>
  `;

  return emailWrapper(content, `${jobs.length} New Job ${jobs.length === 1 ? 'Match' : 'Matches'}!`);
}

// 3. Application Status Email
export function applicationStatusEmail(
  status: ApplicationStatus,
  jobTitle: string,
  companyName: string,
  userName: string
): string {
  const statusConfig = {
    submitted: {
      emoji: '✅',
      title: 'Application Submitted',
      color: '#14B8A6',
      message: `Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been successfully submitted.`,
      description: 'The employer will review your application and get back to you soon. We\'ll keep you updated on any changes.'
    },
    viewed: {
      emoji: '👀',
      title: 'Application Viewed',
      color: '#3B82F6',
      message: `Great news! The hiring team at <strong>${companyName}</strong> has viewed your application for <strong>${jobTitle}</strong>.`,
      description: 'This is a positive sign. They\'re interested in learning more about you!'
    },
    interview: {
      emoji: '🎉',
      title: 'Interview Invitation',
      color: '#10B981',
      message: `Congratulations! You've been invited to interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.`,
      description: 'Check your messages for interview details and prepare to showcase your skills. Good luck!'
    },
    rejected: {
      emoji: '📝',
      title: 'Application Update',
      color: '#94A3B8',
      message: `Thank you for your interest in <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.`,
      description: 'Unfortunately, they\'ve decided to move forward with other candidates. Don\'t be discouraged - the right opportunity is out there!'
    },
    accepted: {
      emoji: '🎊',
      title: 'Offer Received!',
      color: '#F59E0B',
      message: `Fantastic news! You've received an offer for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>!`,
      description: 'Review the offer details in your dashboard and respond at your earliest convenience.'
    }
  };

  const config = statusConfig[status];

  const content = `
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      Hi <strong style="color: #14B8A6;">${userName}</strong>,
    </p>
    <div style="text-align: center; padding: 30px; background-color: #334155; border-radius: 8px; margin: 20px 0;">
      <div style="font-size: 48px; margin-bottom: 15px;">${config.emoji}</div>
      <h2 style="margin: 0 0 15px; font-size: 24px; font-weight: 700; color: ${config.color};">
        ${config.title}
      </h2>
      <p style="margin: 0; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
        ${config.message}
      </p>
    </div>
    <p style="margin: 20px 0; font-size: 15px; color: #94A3B8; line-height: 1.6;">
      ${config.description}
    </p>
    ${button('View Application', `https://your-domain.com/applications/${status}`)}
    ${status === 'rejected' ? `
      <p style="margin: 20px 0 0; font-size: 14px; color: #94A3B8; line-height: 1.6; text-align: center;">
        Keep applying! <a href="https://your-domain.com/jobs" style="color: #14B8A6; text-decoration: underline;">Browse more opportunities</a>
      </p>
    ` : ''}
  `;

  return emailWrapper(content, config.title);
}

// 4. Password Reset Email
export function passwordResetEmail(resetLink: string, userName: string): string {
  const content = `
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      Hi <strong style="color: #14B8A6;">${userName}</strong>,
    </p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      We received a request to reset your password for your IOPPS account. Click the button below to create a new password:
    </p>
    ${button('Reset Password', resetLink)}
    <div style="padding: 15px; background-color: #334155; border-radius: 8px; border-left: 4px solid #F59E0B; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #FCD34D; line-height: 1.6;">
        <strong>Security Note:</strong> This link will expire in 1 hour for your protection.
      </p>
    </div>
    <p style="margin: 20px 0 0; font-size: 14px; color: #94A3B8; line-height: 1.6;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
    <p style="margin: 20px 0 0; font-size: 13px; color: #64748B; line-height: 1.6;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <a href="${resetLink}" style="color: #14B8A6; word-break: break-all;">${resetLink}</a>
    </p>
  `;

  return emailWrapper(content, 'Reset Your Password');
}

// 5. New Message Email
export function newMessageEmail(senderName: string, preview: string, userName: string): string {
  const truncatedPreview = preview.length > 150 ? preview.substring(0, 150) + '...' : preview;

  const content = `
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      Hi <strong style="color: #14B8A6;">${userName}</strong>,
    </p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      You have a new message from <strong style="color: #14B8A6;">${senderName}</strong>:
    </p>
    <div style="padding: 20px; background-color: #334155; border-radius: 8px; border-left: 4px solid #14B8A6; margin: 20px 0;">
      <p style="margin: 0 0 10px; font-size: 13px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">
        Message Preview
      </p>
      <p style="margin: 0; font-size: 15px; color: #E2E8F0; line-height: 1.6; font-style: italic;">
        "${truncatedPreview}"
      </p>
    </div>
    ${button('Read Message', 'https://your-domain.com/messages')}
    <p style="margin: 20px 0 0; font-size: 14px; color: #94A3B8; line-height: 1.6;">
      Reply quickly to keep the conversation going and make a great impression!
    </p>
  `;

  return emailWrapper(content, 'New Message from ' + senderName);
}

// 6. Subscription Email
export function subscriptionEmail(plan: string, expiryDate: string, userName: string): string {
  const content = `
    <p style="margin: 0 0 20px; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      Hi <strong style="color: #14B8A6;">${userName}</strong>,
    </p>
    <div style="text-align: center; padding: 30px; background-color: #334155; border-radius: 8px; margin: 20px 0;">
      <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
      <h2 style="margin: 0 0 15px; font-size: 24px; font-weight: 700; color: #14B8A6;">
        Subscription Confirmed!
      </h2>
      <p style="margin: 0; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
        Your <strong style="color: #14B8A6;">${plan}</strong> subscription is now active.
      </p>
    </div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="padding: 15px; background-color: #334155; border-radius: 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #475569;">
                <p style="margin: 0; font-size: 14px; color: #94A3B8;">Plan</p>
              </td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid #475569;">
                <p style="margin: 0; font-size: 14px; color: #F1F5F9; font-weight: 600;">${plan}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0; font-size: 14px; color: #94A3B8;">Renewal Date</p>
              </td>
              <td align="right" style="padding: 8px 0;">
                <p style="margin: 0; font-size: 14px; color: #F1F5F9; font-weight: 600;">${expiryDate}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin: 20px 0; font-size: 16px; color: #E2E8F0; line-height: 1.6;">
      You now have access to premium features:
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0;">
          <p style="margin: 0; font-size: 15px; color: #E2E8F0;">✓ Post unlimited job listings</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0;">
          <p style="margin: 0; font-size: 15px; color: #E2E8F0;">✓ Access to candidate database</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0;">
          <p style="margin: 0; font-size: 15px; color: #E2E8F0;">✓ Advanced analytics and reporting</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0;">
          <p style="margin: 0; font-size: 15px; color: #E2E8F0;">✓ Priority support</p>
        </td>
      </tr>
    </table>
    ${button('Go to Dashboard', 'https://your-domain.com/employer/dashboard')}
    <p style="margin: 20px 0 0; font-size: 14px; color: #94A3B8; line-height: 1.6;">
      Need help? Visit our <a href="https://your-domain.com/help" style="color: #14B8A6; text-decoration: underline;">Help Center</a> or contact support.
    </p>
  `;

  return emailWrapper(content, 'Subscription Confirmed - ' + plan);
}

// Helper function to send emails
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Replace with your email service provider (Resend, SendGrid, etc.)
    // Example with Resend:
    /*
    import { Resend } from 'resend';
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'IOPPS <noreply@your-domain.com>',
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
    */

    // Example with SendGrid:
    /*
    import sgMail from '@sendgrid/mail';
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

    await sgMail.send({
      to: to,
      from: 'noreply@your-domain.com',
      subject: subject,
      html: html,
    });

    return { success: true };
    */

    // Placeholder implementation
    console.log('📧 Email would be sent to:', to);
    console.log('📧 Subject:', subject);
    console.log('📧 HTML length:', html.length);

    // Simulate email sending
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Utility function to send templated emails
export async function sendTemplatedEmail(
  to: string,
  template: 'welcome' | 'jobAlert' | 'applicationStatus' | 'passwordReset' | 'newMessage' | 'subscription',
  data: any
): Promise<{ success: boolean; error?: string }> {
  let subject = '';
  let html = '';

  switch (template) {
    case 'welcome':
      subject = 'Welcome to IOPPS!';
      html = welcomeEmail(data.userName);
      break;
    case 'jobAlert':
      subject = `${data.jobs.length} New Job ${data.jobs.length === 1 ? 'Match' : 'Matches'}!`;
      html = jobAlertEmail(data.jobs, data.userName);
      break;
    case 'applicationStatus':
      subject = `Application Update: ${data.jobTitle}`;
      html = applicationStatusEmail(data.status, data.jobTitle, data.companyName, data.userName);
      break;
    case 'passwordReset':
      subject = 'Reset Your IOPPS Password';
      html = passwordResetEmail(data.resetLink, data.userName);
      break;
    case 'newMessage':
      subject = `New Message from ${data.senderName}`;
      html = newMessageEmail(data.senderName, data.preview, data.userName);
      break;
    case 'subscription':
      subject = `Subscription Confirmed - ${data.plan}`;
      html = subscriptionEmail(data.plan, data.expiryDate, data.userName);
      break;
    default:
      return { success: false, error: 'Invalid template type' };
  }

  return sendEmail(to, subject, html);
}
