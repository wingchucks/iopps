import type { Metadata } from "next";
import { buildListingMetadata } from "@/lib/server/seo";
import PartnerShowcase from "@/components/PartnerShowcase";
import Footer from "@/components/Footer";
import { publicReadOr } from "@/lib/public-read-timeout";
import { getCachedPartners } from "@/lib/server/public-page-cache";
export const metadata: Metadata = buildListingMetadata({
  title: "Jobs — Indigenous Career Opportunities",
  description:
    "Browse current jobs and career opportunities across Canada on IOPPS.ca, with listings from First Nations, Indigenous organizations, and employers sharing opportunities for Indigenous people.",
  path: "/jobs",
  type: "website",
});
export const dynamic = "force-dynamic";
// Bounds every /jobs page; shared public reads time out well before this.
export const maxDuration = 30;
export default async function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Same short-lived shared read as the homepage; an outage only hides the showcase.
  const partners = await publicReadOr("Jobs partners", getCachedPartners(), []);
  return (
    <>
      {children}
      <PartnerShowcase partners={partners} />
      <Footer />
    </>
  );
}
