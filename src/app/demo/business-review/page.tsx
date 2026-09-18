import { notFound } from "next/navigation";
import BusinessReviewDemo from "./BusinessReviewDemo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business review preview | IOPPS", robots: { index: false, follow: false } };

export default function BusinessReviewDemoPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <BusinessReviewDemo />;
}
