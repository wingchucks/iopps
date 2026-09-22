import { isDisposableOrganizationContact } from "./organization-contact-email";

const contactEmailMessage = "Temporary or disposable email addresses cannot be used for organization setup. Use a permanent contact email. If this form uses your sign-in email, sign in with a permanent-email account or contact support@iopps.ca for help. Do not retry with the same temporary address.";

export function organizationContactEmailError(email: unknown): string {
  return isDisposableOrganizationContact(email) ? contactEmailMessage : "";
}

// Render only allowlisted codes, never arbitrary provider/server exception text.
export function organizationSetupError(status: number, body?: unknown): string {
  const code = body && typeof body === "object" && "code" in body ? body.code : undefined;
  const support = " If this continues, contact support@iopps.ca with your account email; never send your password.";
  if (status === 403 && code === "CONTACT_EMAIL_NOT_SUPPORTED") return contactEmailMessage;
  if (status === 403 && code === "SECURITY_CHECK_FAILED") return "The browser security check did not complete. Refresh this page once and try again. If it still fails, stop retrying and contact support; your organization details are not the cause." + support;
  if (status === 401) return "Your session expired. Sign in again, then resume organization setup." + support;
  if (status === 403) return "We could not verify organization setup. Refresh this page and review your organization details and permanent contact email before retrying." + support;
  if (status === 429) return "Too many organization setup attempts. Wait 30 minutes before retrying; repeated email or organization attempts may require 24 hours." + support;
  if (status === 409) return "An organization record already exists or needs attention. Open your organization dashboard to continue." + support;
  if (status === 400) return "Check the required organization name, type and contact details, then retry. If you already created an organization, open your dashboard." + support;
  return "We could not save your organization. Your draft is retained. Check your connection and retry." + support;
}
