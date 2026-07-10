import { buildListingMetadata } from "@/lib/server/seo";

export const metadata = buildListingMetadata({
  title: "Featured Talent",
  description: "Meet Indigenous professionals and emerging talent featured with their consent on IOPPS.",
  path: "/featured-talent",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
