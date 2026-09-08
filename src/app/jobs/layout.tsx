import type { Metadata } from "next";
import { buildListingMetadata } from "@/lib/server/seo";
import PartnerShowcase from "@/components/PartnerShowcase";
import Footer from "@/components/Footer";
import { getPartners } from "@/lib/server/landing-content";
export const metadata: Metadata = buildListingMetadata({
  title: "Jobs — Indigenous Career Opportunities",
  description:
    "Browse current jobs and career opportunities across Canada on IOPPS.ca, with listings from First Nations, Indigenous organizations, and employers sharing opportunities for Indigenous people.",
  path: "/jobs",
  type: "website",
});
export const dynamic = "force-dynamic";
export default async function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partners = await getPartners();
  return (
    <>
      {children}
      <PartnerShowcase partners={partners} />
      <Footer />
    </>
  );
}
