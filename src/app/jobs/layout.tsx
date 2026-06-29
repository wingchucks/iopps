import type { Metadata } from "next";
import { buildListingMetadata } from "@/lib/server/seo";

export const metadata: Metadata = buildListingMetadata({
  title: "Jobs — Indigenous Career Opportunities",
  description:
    "Browse current jobs and career opportunities across Canada on IOPPS.ca, with listings from First Nations, Indigenous organizations, and employers sharing opportunities for Indigenous people.",
  path: "/jobs",
  type: "website",
});

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
