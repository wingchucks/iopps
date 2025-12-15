import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indigenous Scholarships & Grants",
  description:
    "Find scholarships, bursaries, and grants for Indigenous students across Canada. Access funding for education from undergraduate to graduate studies. Browse opportunities for First Nations, Métis, and Inuit students.",
  keywords: [
    "Indigenous scholarships",
    "Indigenous grants",
    "Indigenous bursaries",
    "First Nations scholarships",
    "Métis scholarships",
    "Inuit scholarships",
    "Indigenous student funding",
    "Indigenous education funding",
    "Indigenous university scholarships",
    "Indigenous college bursaries",
    "Canada Indigenous education",
  ],
  openGraph: {
    title: "Indigenous Scholarships & Grants | IOPPS.ca",
    description:
      "Find scholarships, bursaries, and grants for Indigenous students across Canada. Access funding for your educational journey.",
    url: "/scholarships",
    images: [
      {
        url: "/og-scholarships.png",
        width: 1200,
        height: 630,
        alt: "IOPPS Indigenous Scholarships & Grants",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Indigenous Scholarships & Grants | IOPPS.ca",
    description:
      "Find scholarships, bursaries, and grants for Indigenous students across Canada.",
  },
  alternates: {
    canonical: "/scholarships",
  },
};

export default function ScholarshipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
