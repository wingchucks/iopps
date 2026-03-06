import { getSchoolsServer } from "@/lib/firestore-server";
import SchoolsClient from "./SchoolsClient";
import type { Organization } from "@/lib/firestore/organizations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schools - Indigenous Education Partners | IOPPS",
  description:
    "Explore Indigenous-focused educational institutions and training partners across Canada.",
};

export const revalidate = 120;

export default async function SchoolsPage() {
  const schools = (await getSchoolsServer()) as unknown as Organization[];
  return <SchoolsClient initialSchools={schools} />;
}
