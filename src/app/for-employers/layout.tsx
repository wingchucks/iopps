import { buildListingMetadata } from "@/lib/server/seo";

export const metadata = buildListingMetadata({
  title: "For Employers",
  description: "Reach Indigenous talent and share current employment opportunities through IOPPS.",
  path: "/for-employers",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
