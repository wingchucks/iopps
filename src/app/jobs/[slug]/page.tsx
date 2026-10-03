import { redirect } from "next/navigation";
import { getAdminDb } from "@/lib/firebase-admin";
import { publicReadOr, withPublicReadTimeout } from "@/lib/public-read-timeout";
import { readJobAliasRedirect } from "@/lib/server/job-aliases";
import JobDetailClient from "./JobDetailClient";
export const dynamic = "force-dynamic";
// Resolved per request and bounded like the other public reads. A failed or slow lookup
// means no redirect, as for an unknown alias: the page still renders and loads the job.
const readAliasRedirect = withPublicReadTimeout(
  (slug: string) => readJobAliasRedirect(getAdminDb(), slug),
  "Job alias redirect",
);
export default async function JobDetailPage({ params }: { params: Promise<{slug:string}> }) {
  const {slug} = await params;
  const destination = await publicReadOr(`Job alias redirect for ${slug}`, readAliasRedirect(slug), null);
  // Temporary 307 is intentional: rollback must remain meaningful.
  if (destination) redirect(destination);
  return <JobDetailClient />;
}
