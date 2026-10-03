import { createRemoteJWKSet, jwtVerify } from "jose";

// Vercel Cron stopped invoking the daily jobs in September 2026, so GitHub Actions also runs
// them (.github/workflows/scheduled-jobs.yml). That workflow sends a short-lived GitHub OIDC
// token instead of a stored secret; it only passes when GitHub signed it for this audience,
// for this repository (by ID, so a renamed or recreated namesake never matches) and for that
// workflow file on master, started by its schedule or by hand.
const GITHUB_ACTIONS_ISSUER = "https://token.actions.githubusercontent.com";
export const SCHEDULED_JOBS_AUDIENCE = "iopps-scheduled-jobs";
export const SCHEDULED_JOBS_WORKFLOW = ".github/workflows/scheduled-jobs.yml";
const REPOSITORY_ID = "1160177200"; // wingchucks/iopps
const WORKFLOW_REF = `wingchucks/iopps/${SCHEDULED_JOBS_WORKFLOW}@refs/heads/master`;
const WORKFLOW_EVENTS = new Set(["schedule", "workflow_dispatch"]);

const githubKeys = createRemoteJWKSet(new URL(`${GITHUB_ACTIONS_ISSUER}/.well-known/jwks`));

/** True for Vercel Cron (CRON_SECRET) or the scheduled-jobs GitHub workflow. */
export async function isScheduledJobRequest(request: Request): Promise<boolean> {
  const authorization = request.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (secret && authorization === `Bearer ${secret}`) return true;
  const token = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/.exec(authorization)?.[1];
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, githubKeys, {
      issuer: GITHUB_ACTIONS_ISSUER,
      audience: SCHEDULED_JOBS_AUDIENCE,
      algorithms: ["RS256"],
      clockTolerance: 60,
    });
    return payload.repository_id === REPOSITORY_ID
      && payload.workflow_ref === WORKFLOW_REF
      && WORKFLOW_EVENTS.has(String(payload.event_name));
  } catch {
    return false;
  }
}
