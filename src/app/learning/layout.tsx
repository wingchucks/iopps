import type { Metadata } from "next";
export const metadata: Metadata = { title: "My Learning", description: "Track your learning progress and enrolled programs.", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
