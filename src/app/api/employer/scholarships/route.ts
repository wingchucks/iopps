import { deleteOrganizationOpportunity, listOrganizationOpportunities, saveOrganizationOpportunity } from "@/lib/server/organization-opportunities";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => listOrganizationOpportunities(req, "scholarships");
export const POST = (req: Request) => saveOrganizationOpportunity(req, "scholarships");
export const PATCH = (req: Request) => saveOrganizationOpportunity(req, "scholarships", true);

export const DELETE = (req: Request) => deleteOrganizationOpportunity(req, "scholarships");
