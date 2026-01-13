import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Businesses | IOPPS",
  description:
    "Discover Indigenous businesses, employers, schools, and organizations across Canada. Find jobs, programs, products, services, events, and funding opportunities.",
  openGraph: {
    title: "Indigenous Business Directory | IOPPS",
    description:
      "Connect with Indigenous-owned businesses, employers, schools, and organizations. Explore opportunities across Canada.",
    type: "website",
    siteName: "IOPPS",
  },
};

export default function BusinessesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
