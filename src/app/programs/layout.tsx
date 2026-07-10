import type { Metadata } from "next";
export const metadata: Metadata = { title: "Programs", description: "Browse programs through the IOPPS schools directory.", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
