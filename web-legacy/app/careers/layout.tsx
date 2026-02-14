import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indigenous Jobs & Careers",
  description:
    "Find career opportunities with employers committed to Indigenous hiring across Canada. Browse full-time, part-time, contract, and remote Indigenous jobs. IOPPS connects Indigenous talent with meaningful employment.",
  keywords: [
    "Indigenous jobs",
    "Indigenous careers",
    "Indigenous employment",
    "First Nations jobs",
    "Métis jobs",
    "Inuit jobs",
    "Indigenous hiring",
    "remote Indigenous jobs",
    "Indigenous job board",
    "Canada Indigenous employment",
  ],
  openGraph: {
    title: "Indigenous Jobs & Careers | IOPPS.ca",
    description:
      "Find career opportunities with employers committed to Indigenous hiring across Canada. Browse jobs from organizations supporting economic reconciliation.",
    url: "/careers",
  },
  twitter: {
    card: "summary_large_image",
    title: "Indigenous Jobs & Careers | IOPPS.ca",
    description:
      "Find career opportunities with employers committed to Indigenous hiring across Canada.",
  },
  alternates: {
    canonical: "/careers",
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
