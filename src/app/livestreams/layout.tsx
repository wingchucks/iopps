import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Livestreams — Watch & Hire IOPPS",
  description:
    "Watch Indigenous pow wows, conferences, and community events live on IOPPS. Hire IOPPS to livestream your next event to audiences across North America.",
  alternates: { canonical: "/livestreams" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
