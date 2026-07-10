import { buildListingMetadata } from "@/lib/server/seo";

export const metadata = buildListingMetadata({
  title: "Privacy Policy",
  description: "Read how IOPPS collects, uses, and protects personal information.",
  path: "/privacy",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
