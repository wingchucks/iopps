import { notFound } from "next/navigation";
import OpportunityDemo from "./OpportunityDemo";
export const dynamic = "force-dynamic";
export const metadata = { title: "Community opportunities demo | IOPPS", robots: { index: false, follow: false } };
export default function Page() { if (process.env.VERCEL_ENV === "production") notFound(); return <OpportunityDemo />; }
