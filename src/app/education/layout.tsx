import type { Metadata } from "next";
export const metadata: Metadata = { title: "Education", description: "Explore Indigenous education resources, courses, and learning opportunities available through organizations listed on IOPPS.", alternates: { canonical: "/education" } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
