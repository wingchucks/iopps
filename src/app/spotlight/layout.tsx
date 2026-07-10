import type { Metadata } from "next";
export const metadata: Metadata = { title: "Spotlight — Videos & Livestreams", description: "Watch IOPPS Spotlight videos, interviews, and livestreams featuring Indigenous leaders, organizations, and community stories.", alternates: { canonical: "/spotlight" } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
