import { getScholarshipBySlugServer, getScholarshipsServer, getOrganizationServer } from "@/lib/firestore-server";
import ScholarshipDetailClient from "./ScholarshipDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scholarship = await getScholarshipBySlugServer(slug);
  if (!scholarship) return { title: "Scholarship Not Found | IOPPS" };
  const title = scholarship.title as string;
  const amount = (scholarship.amount || "") as string;
  const desc =
    (scholarship.description as string | undefined)?.slice(0, 160) ||
    `${title}${amount ? ` - ${amount}` : ""} - Apply now on IOPPS.`;
  return {
    title: `${title} | IOPPS Scholarships`,
    description: desc,
  };
}

export default async function ScholarshipDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scholarship = await getScholarshipBySlugServer(slug);
  if (!scholarship) notFound();

  // Fetch org and related scholarships in parallel
  const orgId = scholarship.orgId as string | undefined;
  const [org, allScholarships] = await Promise.all([
    orgId ? getOrganizationServer(orgId) : Promise.resolve(null),
    getScholarshipsServer(),
  ]);

  const related = allScholarships
    .filter((s: Record<string, unknown>) => s.id !== scholarship.id)
    .slice(0, 3);

  return (
    <ScholarshipDetailClient
      scholarship={scholarship}
      org={org}
      related={related}
    />
  );
}
