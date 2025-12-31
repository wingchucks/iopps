import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing & Plans",
    description:
          "Flexible pricing for job postings, employer subscriptions, conferences, training programs, and Shop Indigenous vendor listings. Partner with IOPPS to connect with Indigenous talent.",
    openGraph: {
          title: "Pricing & Plans | Partner with IOPPS",
          description:
                  "Post jobs, list conferences, feature training programs, and showcase Indigenous-owned businesses. Flexible pricing for organizations committed to Indigenous hiring.",
          url: "https://iopps.ca/pricing",
          siteName: "IOPPS",
          type: "website",
    },
    twitter: {
          card: "summary",
          title: "Pricing & Plans | Partner with IOPPS",
          description:
                  "Flexible pricing for job postings, conferences, and Indigenous business listings.",
    },
};

export default function PricingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
