import type { Metadata } from "next";
export const metadata: Metadata = { title: "My Learning", description: "Track your learning progress, enrolled courses, and completed training programs on the IOPPS platform." };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
