import type { Metadata } from "next";
import { generateProgramMetadata } from "@/lib/server/detail-metadata";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  return generateProgramMetadata(slug);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
