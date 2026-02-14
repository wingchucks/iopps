"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Skeleton,
} from "@/components/ui";
import type { Scholarship } from "@/lib/firestore/scholarships";

// ============================================
// CONSTANTS
// ============================================

const QUICK_LINKS = [
  {
    title: "Scholarships & Funding",
    description:
      "Scholarships, bursaries, and grants for Indigenous learners across Canada.",
    href: "/education/scholarships",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Programs & Training",
    description:
      "Academic degrees, diplomas, certificates, and professional training programs.",
    href: "/education/programs",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: "Schools & Institutions",
    description:
      "Explore Indigenous-serving institutions, tribal colleges, and universities.",
    href: "/education/schools",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
      </svg>
    ),
  },
] as const;

// ============================================
// TYPES
// ============================================

interface ScholarshipsApiResponse {
  scholarships: Scholarship[];
  pagination: {
    total: number;
  };
}

// ============================================
// COMPONENT
// ============================================

export default function EducationPage() {
  const [featuredScholarships, setFeaturedScholarships] = useState<
    Scholarship[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await fetch("/api/education/scholarships?limit=4&page=1");
        if (!res.ok) throw new Error("Failed to fetch scholarships");
        const data: ScholarshipsApiResponse = await res.json();
        setFeaturedScholarships(data.scholarships);
      } catch (error) {
        console.error("Failed to load featured scholarships:", error);
      } finally {
        setLoading(false);
      }
    }
    void loadFeatured();
  }, []);

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-card-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-bg via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <Badge variant="info" className="mb-4">
              Education Hub
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Empowering Indigenous Education
            </h1>
            <p className="mt-4 text-lg text-text-secondary sm:text-xl">
              Discover scholarships, training programs, and schools supporting
              Indigenous learners across Canada. Your educational journey starts
              here.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/education/scholarships" size="lg">
                Browse Scholarships
              </Button>
              <Button href="/education/programs" variant="secondary" size="lg">
                Explore Programs
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="group">
              <Card className="h-full transition-all duration-200 hover:border-card-border-hover hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-bg text-accent">
                    {link.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                    {link.title}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {link.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Scholarships */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              Featured Scholarships
            </h2>
            <p className="mt-1 text-text-secondary">
              Recently posted funding opportunities
            </p>
          </div>
          <Button href="/education/scholarships" variant="ghost" size="sm">
            View all
            <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton variant="rectangular" className="mb-4 h-8" />
                  <Skeleton className="mb-2" />
                  <Skeleton className="w-2/3" />
                  <Skeleton className="mt-4 h-6 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : featuredScholarships.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredScholarships.map((scholarship) => (
              <ScholarshipQuickCard
                key={scholarship.id}
                scholarship={scholarship}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-text-muted">
                No scholarships available at the moment. Check back soon.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Stats Section */}
      <section className="border-t border-card-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            <div>
              <div className="text-3xl font-bold text-accent">Scholarships</div>
              <p className="mt-1 text-text-secondary">
                Funding for Indigenous learners
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">Programs</div>
              <p className="mt-1 text-text-secondary">
                Academic and training paths
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">Schools</div>
              <p className="mt-1 text-text-secondary">
                Indigenous-serving institutions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Card className="overflow-hidden">
          <div className="relative bg-gradient-to-r from-accent/10 via-accent-bg to-transparent p-8 sm:p-12 text-center">
            <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
              Are you an education provider?
            </h2>
            <p className="mt-3 text-text-secondary max-w-2xl mx-auto">
              List your institution, programs, or scholarships on IOPPS and
              connect with Indigenous learners across Canada.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Button href="/organization/education/setup" size="lg">
                List Your School
              </Button>
              <Button
                href="/organization/scholarships/new"
                variant="outline"
                size="lg"
              >
                Post a Scholarship
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

// ============================================
// SCHOLARSHIP QUICK CARD (internal)
// ============================================

function ScholarshipQuickCard({
  scholarship,
}: {
  scholarship: Scholarship;
}) {
  const formatAmount = (amount: Scholarship["amount"]): string | null => {
    if (!amount) return null;
    if (typeof amount === "string") return amount;
    if (typeof amount === "number") {
      return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        minimumFractionDigits: 0,
      }).format(amount);
    }
    return null;
  };

  const formattedAmount = formatAmount(scholarship.amount);

  return (
    <Link
      href={`/education/scholarships/${scholarship.id}`}
      className="group"
    >
      <Card className="h-full transition-all duration-200 hover:border-card-border-hover hover:-translate-y-1">
        <CardContent className="p-6">
          {formattedAmount && (
            <div className="mb-3 text-2xl font-bold text-accent">
              {formattedAmount}
            </div>
          )}
          <h3 className="text-base font-semibold text-text-primary line-clamp-2 group-hover:text-accent transition-colors">
            {scholarship.title}
          </h3>
          <p className="mt-1 text-sm text-text-muted line-clamp-1">
            {scholarship.provider}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {scholarship.type && (
              <Badge variant="default">{scholarship.type}</Badge>
            )}
            {scholarship.level && (
              <Badge variant="info">{scholarship.level}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
