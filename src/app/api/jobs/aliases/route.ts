import { getAdminDb } from "@/lib/firebase-admin";
import { handleJobAliases } from "@/lib/server/job-aliases";
export const dynamic = "force-dynamic";
export async function POST(request: Request) { return handleJobAliases(request, getAdminDb()); }
