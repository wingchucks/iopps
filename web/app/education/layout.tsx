import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indigenous Education | Scholarships, Schools & Training Programs",
  description:
    "Explore Indigenous scholarships, verified schools, and training programs across Canada. IOPPS connects Indigenous learners with education opportunities supporting career growth and community development.",
  keywords: [
    "Indigenous scholarships",
    "Indigenous education",
    "First Nations scholarships",
    "Indigenous training programs",
    "Indigenous schools",
    "Metis education",
    "Inuit scholarships",
    "Indigenous student funding",
    "Indigenous career training",
    "Canada Indigenous education",
  ],
  openGraph: {
    title: "Indigenous Education | IOPPS.ca",
    description:
      "Discover scholarships, verified schools, and training programs for Indigenous learners across Canada.",
    url: "https://iopps.ca/education",
    siteName: "IOPPS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Indigenous Education | IOPPS.ca",
    description:
      "Discover scholarships, verified schools, and training programs for Indigenous learners across Canada.",
  },
  alternates: {
    canonical: "/education",
  },
};

export default function EducationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
