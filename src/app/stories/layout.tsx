import type { Metadata } from "next";
export const metadata: Metadata = { title: "Success Stories", description: "Read inspiring Indigenous success stories and community spotlights from across Canada.", alternates: { canonical: "/stories" } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
