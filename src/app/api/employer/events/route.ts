import { listOrganizationOpportunities, saveOrganizationOpportunity } from "@/lib/server/organization-opportunities";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => listOrganizationOpportunities(req, "events");
export const POST = (req: Request) => saveOrganizationOpportunity(req, "events");
export const PATCH = (req: Request) => saveOrganizationOpportunity(req, "events", true);
