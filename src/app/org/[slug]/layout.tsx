import type { Metadata } from "next";
import { generateOrgMetadata } from "@/lib/server/detail-metadata";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  return generateOrgMetadata(slug);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
