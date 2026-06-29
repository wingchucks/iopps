import type { Metadata } from "next";
import { buildListingMetadata } from "@/lib/server/seo";

export const metadata: Metadata = buildListingMetadata({
  title: "Training — Indigenous Programs, Courses & Professional Development",
  description:
    "Explore training programs, professional development, microcredentials, and learning opportunities on IOPPS.ca for Indigenous people and communities across Canada.",
  path: "/training",
  type: "website",
});

export default function TrainingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
