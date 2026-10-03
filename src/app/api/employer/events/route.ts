import { deleteOrganizationOpportunity, listOrganizationOpportunities, saveOrganizationOpportunity } from "@/lib/server/organization-opportunities";
import { rejectUnapprovedPublishing } from "@/lib/server/employer-auth";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => listOrganizationOpportunities(req, "events");
// A rejected organization can still save drafts, but publishing waits for IOPPS approval.
export const POST = async (req: Request) => (await rejectUnapprovedPublishing(req)) ?? saveOrganizationOpportunity(req, "events");
export const PATCH = async (req: Request) => (await rejectUnapprovedPublishing(req)) ?? saveOrganizationOpportunity(req, "events", true);

export const DELETE = (req: Request) => deleteOrganizationOpportunity(req, "events");
