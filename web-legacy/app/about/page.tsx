import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About IOPPS | Indigenous Opportunities & Partnerships Platform",
  description:
    "Learn about IOPPS - Canada's platform empowering Indigenous success through jobs, scholarships, conferences, pow wows, and Indigenous-owned businesses. Supporting TRC Call to Action #92.",
  openGraph: {
    title: "About IOPPS | Empowering Indigenous Success",
    description:
      "IOPPS connects Indigenous peoples with opportunities in employment, education, and business. Learn about our mission and commitment to reconciliation.",
    url: "https://iopps.ca/about",
    siteName: "IOPPS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About IOPPS | Empowering Indigenous Success",
    description:
      "IOPPS connects Indigenous peoples with opportunities in employment, education, and business.",
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
