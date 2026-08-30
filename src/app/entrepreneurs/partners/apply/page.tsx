import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import { aiicAwarenessCampaignPackage } from "@/lib/entrepreneur-resources";

export const metadata: Metadata = {
  title: "Partner With IOPPS Entrepreneur Supports | IOPPS.CA",
  description:
    "Submit an Indigenous entrepreneur resource or ask about a custom IOPPS awareness campaign for entrepreneur supports.",
};

const partnerEmail = "nathan.arias@iopps.ca";
const mailtoSubject = encodeURIComponent("Entrepreneur Support Partnership Inquiry");
const mailtoBody = encodeURIComponent(`Tansi Nathan,

We are interested in partnering with IOPPS Entrepreneur Supports.

Organization:
Contact name:
Email:
Phone:
Province/region served:
Website:
Support categories:
What we want entrepreneurs to know:
Are we asking for a free resource review or a custom awareness campaign?:

Thank you.`);

function Header() {
  return (
    <header className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-3 no-underline">
        <Image src="/logo.png" alt="IOPPS" width={42} height={42} />
        <span className="text-xl font-black tracking-[0.18em] text-text">IOPPS</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}

export default function EntrepreneurPartnerApplyPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="mx-auto max-w-[1080px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <Link href="/entrepreneurs" className="text-sm font-bold text-teal no-underline">&larr; Entrepreneur Supports</Link>

        <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div>
            <Badge text="Resource partners" color="var(--teal)" bg="var(--teal-soft)" />
            <h1 className="mt-4 text-4xl font-black leading-tight text-text sm:text-5xl">Help entrepreneurs find your support.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-text-sec">
              If your organization supports Indigenous entrepreneurs, IOPPS can review your resource for the entrepreneur hub or discuss a custom awareness campaign.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={`mailto:${partnerEmail}?subject=${mailtoSubject}&body=${mailtoBody}`} className="no-underline">
                <Button variant="primary-teal" size="lg">Email Partnership Details</Button>
              </Link>
              <Link href="/entrepreneurs/partners/aiic" className="no-underline">
                <Button variant="outline" size="lg">View AIIC Example</Button>
              </Link>
            </div>
          </div>

          <Card variant="spotlight">
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-black text-text">What to send</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-text-sec">
                <li>• Organization name and official website</li>
                <li>• Province/region served</li>
                <li>• Funding, training, mentorship, or program categories</li>
                <li>• Best contact and booking link</li>
                <li>• Whether you want resource placement or a custom campaign</li>
              </ul>
            </div>
          </Card>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <Card>
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-black text-text">Resource review</h2>
              <p className="mt-4 text-sm leading-7 text-text-sec">
                For legitimate Indigenous entrepreneur support organizations, IOPPS can review the resource and decide whether it fits the public entrepreneur hub.
              </p>
              <p className="mt-4 text-sm font-bold text-text">No resource goes public without review and approval.</p>
            </div>
          </Card>
          <Card>
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-black text-text">Custom awareness campaigns</h2>
              <p className="mt-4 text-sm leading-7 text-text-sec">
                For organizations that want IOPPS to actively promote their entrepreneur supports, IOPPS can quote a custom campaign with website placement, social/community promotion, features, and reporting.
              </p>
            </div>
          </Card>
        </section>

        <section className="mt-12 rounded-[28px] border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-text-muted">Example custom package</p>
          <h2 className="mt-3 text-3xl font-black text-text">{aiicAwarenessCampaignPackage.name}</h2>
          <p className="mt-4 text-sm leading-7 text-text-sec">{aiicAwarenessCampaignPackage.positioning}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border p-4"><p className="text-xs font-black uppercase text-text-muted">Price</p><p className="mt-1 text-xl font-black text-text">{aiicAwarenessCampaignPackage.priceLabel}</p></div>
            <div className="rounded-2xl border border-border p-4"><p className="text-xs font-black uppercase text-text-muted">Term</p><p className="mt-1 text-xl font-black text-text">12 months</p></div>
            <div className="rounded-2xl border border-border p-4"><p className="text-xs font-black uppercase text-text-muted">Split</p><p className="mt-1 text-xl font-black text-text">{aiicAwarenessCampaignPackage.invoiceSplit}</p></div>
          </div>
          <p className="mt-5 text-sm font-bold text-text">
            This is separate from public job/program posting plans and does not include unlimited program posting.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
