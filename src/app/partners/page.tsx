import { getOrganizationsServer } from "@/lib/firestore-server";
import PartnersClient from "./PartnersClient";
import type { Organization } from "@/lib/firestore/organizations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partners - Indigenous Talent Directory | IOPPS",
  description:
    "Employers, schools, and organizations partnering with IOPPS to create opportunities for Indigenous communities across Canada.",
};

export const revalidate = 120;

export default async function PartnersPage() {
  const orgs = (await getOrganizationsServer()) as unknown as Organization[];
  return <PartnersClient initialOrgs={orgs} />;
}
