import { Suspense } from "react";
import { notFound } from "next/navigation";
import EmployerDemo from "./EmployerDemo";

export const metadata = { title: "Employer demo | IOPPS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function EmployerDemoPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <Suspense fallback={<p className="p-8">Loading employer demo…</p>}><EmployerDemo /></Suspense>;
}
