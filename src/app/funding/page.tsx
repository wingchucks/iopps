import type { Metadata } from "next";
import Link from "next/link";
import OpportunityHeader from "@/components/OpportunityHeader";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Grants & Funding",
  description: "Discover funding resources for Indigenous entrepreneurs on IOPPS.",
  alternates: { canonical: "/funding" },
};

export default function FundingPage() {
  return (
    <div className="op-site min-h-screen bg-bg">
      <OpportunityHeader />
      <div className="op-wrap py-12 md:py-16" data-main-content tabIndex={-1}>
        <Link href="/businesses" className="text-teal font-semibold">← Indigenous businesses</Link>
        <p className="op-eyebrow mt-8">Indigenous Entrepreneurship</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">Grants &amp; funding</h1>
        <p className="mt-4 max-w-2xl text-lg text-text-sec">A place to discover funding opportunities and read program details on IOPPS.</p>
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8" aria-labelledby="funding-status">
          <h2 id="funding-status" className="text-2xl font-bold">Funding listings are coming</h2>
          <p className="mt-3 max-w-2xl text-text-sec leading-relaxed">There are no funding listings published here yet. As opportunities are added, you’ll be able to review who they support, key dates, and how to apply.</p>
          <p className="mt-3 max-w-2xl text-text-sec leading-relaxed">In the meantime, explore our business support resources or share a program with the IOPPS team.</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/businesses#business-support" className="op-button">Explore business support →</Link>
            <Link href="/contact" className="inline-flex items-center py-3 font-semibold text-teal">Share a funding opportunity →</Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
