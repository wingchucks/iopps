// Someone who chose "Share an event" (or post a job or scholarship) and then signs up should start
// as an organization, see why, and land back on the task afterwards. The redirect is only a hint
// for the signup screen; every organization page still checks access itself.
export type OrganizationTask = "event" | "scholarship" | "job" | "organization";

export function organizationTaskFor(redirect: string | null | undefined): OrganizationTask | null {
  if (typeof redirect !== "string" || !redirect.startsWith("/") || redirect.startsWith("//")) return null;
  const path = redirect.split(/[?#]/)[0];
  if (/^\/org\/dashboard\/events(\/|$)/.test(path)) return "event";
  if (/^\/org\/dashboard\/scholarships(\/|$)/.test(path)) return "scholarship";
  if (/^\/org\/(dashboard\/jobs|checkout|plans)(\/|$)/.test(path)) return "job";
  if (/^\/org\/(dashboard|onboarding|upgrade)(\/|$)/.test(path)) return "organization";
  return null;
}

export const ORGANIZATION_TASK_MESSAGE: Record<OrganizationTask, string> = {
  event: "Sharing an event needs an organization account. Choose Business or organization, add your organization’s name, and you’ll come straight back to your event.",
  scholarship: "Sharing a scholarship or funding opportunity needs an organization account. Choose Business or organization, add your organization’s name, and you’ll come straight back to it.",
  job: "Posting a job needs an organization account. Choose Business or organization, add your organization’s name, and you’ll come straight back to your job posting.",
  organization: "This part of IOPPS is for organizations. Choose Business or organization to continue.",
};
