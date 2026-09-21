// Do not render arbitrary provider/server exception text in onboarding.
export function organizationSetupError(status: number): string {
  const support = " If this continues, contact support@iopps.ca with your account email; never send your password.";
  if (status === 401) return "Your session expired. Sign in again, then resume organization setup." + support;
  if (status === 403) return "We could not verify organization setup. Refresh this page and review your organization details and permanent contact email before retrying." + support;
  if (status === 429) return "Too many organization setup attempts. Wait 30 minutes before retrying; repeated email or organization attempts may require 24 hours." + support;
  if (status === 409) return "An organization record already exists or needs attention. Open your organization dashboard to continue." + support;
  if (status === 400) return "Check the required organization name, type and contact details, then retry. If you already created an organization, open your dashboard." + support;
  return "We could not save your organization. Your draft is retained. Check your connection and retry." + support;
}
