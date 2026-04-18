import type { Metadata } from "next";
import { generateMemberMetadata } from "@/lib/server/detail-metadata";

export async function generateMetadata(
  { params }: { params: Promise<{ uid: string }> },
): Promise<Metadata> {
  const { uid } = await params;
  return generateMemberMetadata(uid);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
