import { redirect } from "next/navigation";
import { getAdminDb } from "@/lib/firebase-admin";
import { readJobAliasRedirect } from "@/lib/server/job-aliases";
import JobDetailClient from "./JobDetailClient";
export const dynamic = "force-dynamic";
export default async function JobDetailPage({ params }: { params: Promise<{slug:string}> }) {
  const {slug} = await params;
  const destination = await readJobAliasRedirect(getAdminDb(), slug);
  // Temporary 307 is intentional: rollback must remain meaningful.
  if (destination) redirect(destination);
  return <JobDetailClient />;
}
