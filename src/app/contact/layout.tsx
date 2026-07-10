import { buildListingMetadata } from "@/lib/server/seo";

export const metadata = buildListingMetadata({
  title: "Contact IOPPS",
  description: "Contact IOPPS for help, corrections, accessibility feedback, or organization questions.",
  path: "/contact",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
