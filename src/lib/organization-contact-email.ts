// Public eligibility rule shared by organization forms and the server guard.
// This is not authentication; the server still applies every abuse check.
const DISPOSABLE_CONTACT_DOMAINS = new Set([
  "10minutemail.com", "guerrillamail.com", "mailinator.com", "sharklasers.com",
  "temp-mail.org", "tempmail.com", "yopmail.com",
]);

export function isDisposableOrganizationContact(email: unknown): boolean {
  if (typeof email !== "string") return false;
  return DISPOSABLE_CONTACT_DOMAINS.has(email.trim().toLowerCase().split("@")[1] || "");
}
