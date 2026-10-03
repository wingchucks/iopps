import { getAdminDb } from "@/lib/firebase-admin";
import { handleJobAliases } from "@/lib/server/job-aliases";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: Request) { return handleJobAliases(request, getAdminDb()); }
