import { buildListingMetadata } from "@/lib/server/seo";

export const metadata = buildListingMetadata({
  title: "About IOPPS",
  description: "Learn about IOPPS, its mission, service area, and opportunity-listing standards.",
  path: "/about",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
