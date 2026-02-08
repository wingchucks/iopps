import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact IOPPS | Get in Touch",
  description:
    "Contact the IOPPS team for partnerships, job postings, Indigenous business listings, or general inquiries. We respond within two business days.",
  openGraph: {
    title: "Contact IOPPS | Get in Touch",
    description:
      "Reach out to IOPPS for partnerships, job postings, or questions. We're building Indigenous workforce connections across Canada.",
    url: "https://iopps.ca/contact",
    siteName: "IOPPS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact IOPPS | Get in Touch",
    description:
      "Reach out to IOPPS for partnerships, job postings, or questions.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
