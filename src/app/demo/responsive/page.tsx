import { notFound } from "next/navigation";
import ResponsivePreview from "./ResponsivePreview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Screen size preview | IOPPS", robots: { index: false, follow: false } };

export default function ResponsivePreviewPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <ResponsivePreview />;
}
