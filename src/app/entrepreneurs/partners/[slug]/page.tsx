import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import { entrepreneurPartners, getEntrepreneurPartner } from "@/lib/entrepreneur-resources";

export function generateStaticParams() {
  return entrepreneurPartners.map((partner) => ({ slug: partner.slug }));
}

type PartnerParams = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: PartnerParams }): Promise<Metadata> {
  const { slug } = await params;
  const partner = getEntrepreneurPartner(slug);
  if (!partner) return { title: "Entrepreneur Partner | IOPPS.CA" };
  return {
    title: `${partner.shortName} Entrepreneur Supports | IOPPS.CA`,
    description: partner.summary,
  };
}

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

export default async function EntrepreneurPartnerPage({ params }: { params: PartnerParams }) {
  const { slug } = await params;
  const partner = getEntrepreneurPartner(slug);
  if (!partner) notFound();

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="mx-auto max-w-[1180px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <Link href="/entrepreneurs/alberta" className="text-sm font-bold text-teal no-underline">&larr; Alberta Entrepreneur Supports</Link>

        <section className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <Badge text={partner.partnerLabel} color="var(--teal)" bg="var(--teal-soft)" />
            <h1 className="mt-4 text-4xl font-black leading-tight text-text sm:text-5xl">{partner.name}</h1>
            <p className="mt-4 text-xl font-bold text-text">{partner.summary}</p>
            <p className="mt-5 max-w-3xl text-base leading-8 text-text-sec">{partner.description}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={partner.bookingUrl || partner.website} className="no-underline" target="_blank" rel="noreferrer">
                <Button variant="primary-teal" size="lg">Book or Contact AIIC</Button>
              </Link>
              <Link href={partner.website} className="no-underline" target="_blank" rel="noreferrer">
                <Button variant="outline" size="lg">Official Website</Button>
              </Link>
            </div>
          </div>

          <Card variant="spotlight">
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-black text-text">Official contact</h2>
              <dl className="mt-5 space-y-4 text-sm leading-6 text-text-sec">
                <div><dt className="font-black text-text">Email</dt><dd>{partner.contactEmail}</dd></div>
                <div><dt className="font-black text-text">Phone</dt><dd>{partner.phone}</dd></div>
                <div><dt className="font-black text-text">Booking</dt><dd className="break-words">{partner.bookingUrl}</dd></div>
              </dl>
              <p className="mt-5 text-xs leading-6 text-text-muted">Eligibility, applications, and financing decisions are handled by AIIC directly.</p>
            </div>
          </Card>
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-3">
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-black text-text">Programs mentioned</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-text-sec">
                {partner.programs.map((program) => <li key={program}>• {program}</li>)}
              </ul>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-black text-text">Services</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-text-sec">
                {partner.services.map((service) => <li key={service}>• {service}</li>)}
              </ul>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-black text-text">Eligibility notes</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-text-sec">
                {partner.eligibility.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </Card>
        </section>

        <section className="mt-12 rounded-[28px] border border-border bg-card p-6 sm:p-8">
          <h2 className="text-3xl font-black text-text">IOPPS note</h2>
          <p className="mt-4 text-sm leading-7 text-text-sec">{partner.notes}</p>
          <p className="mt-3 text-sm leading-7 text-text-sec">
            IOPPS promotes awareness and helps entrepreneurs discover resources. This page is not financial advice and is not an AIIC application form.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
