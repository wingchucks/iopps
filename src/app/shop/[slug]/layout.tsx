import type { Metadata } from "next";
import { generateShopJsonLd, generateShopMetadata } from "@/lib/server/detail-metadata";
import { serializeJsonLd } from "@/lib/server/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return generateShopMetadata(slug);
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const jsonLd = await generateShopJsonLd(slug);
  return <>{jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} /> : null}{children}</>;
}
