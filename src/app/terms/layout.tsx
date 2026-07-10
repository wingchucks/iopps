import { buildListingMetadata } from "@/lib/server/seo";

export const metadata = buildListingMetadata({
  title: "Terms of Service",
  description: "Read the terms governing use of IOPPS.ca.",
  path: "/terms",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
