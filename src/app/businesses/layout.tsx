import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Businesses & Employers",
  description:
    "Explore Indigenous-led businesses, employers, and partner organizations creating opportunities across Indigenous communities.",
  alternates: {
    canonical: "/businesses",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
