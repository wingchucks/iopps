import type { Metadata } from "next";
export const metadata: Metadata = { title: "Member Directory", description: "Browse the signed-in IOPPS member directory.", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
