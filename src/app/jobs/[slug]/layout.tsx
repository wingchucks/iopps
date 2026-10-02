export const dynamic = "force-dynamic";
export const maxDuration = 30;
import type { Metadata } from "next";
import { getJobPageJsonLd, getJobPageMetadata } from "@/lib/server/public-page-cache";
import { serializeJsonLd } from "@/lib/server/seo";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  return getJobPageMetadata(slug);
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const jsonLd = await getJobPageJsonLd(slug);
  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  );
}
