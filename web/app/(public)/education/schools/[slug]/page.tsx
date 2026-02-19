"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Skeleton,
} from "@/components/ui";
import type { School } from "@/lib/firestore/schools";
import type { EducationProgram } from "@/lib/firestore/educationPrograms";
import type { Scholarship } from "@/lib/firestore/scholarships";

// ============================================
// COMPONENT
// ============================================

export default function SchoolDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [school, setSchool] = useState<School | null>(null);
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function loadSchoolData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch school list and find by slug or id
        const schoolRes = await fetch("/api/education/schools");
        if (!schoolRes.ok) throw new Error("Failed to fetch schools");
        const schoolData = await schoolRes.json();
        const found = (schoolData.schools as School[]).find(
          (s) => s.slug === slug || s.id === slug,
        );

        if (!found) {
          setError("School not found.");
          setLoading(false);
          return;
        }

        setSchool(found);

        // Fetch programs for this school
        const programsRes = await fetch(
          `/api/education/programs?schoolId=${found.id}&limit=100`,
        );
        if (programsRes.ok) {
          const programsData = await programsRes.json();
          setPrograms(programsData.programs ?? []);
        }

        // Fetch scholarships and filter by schoolId client-side
        const scholarshipsRes = await fetch(
          `/api/education/scholarships?limit=200&page=1`,
        );
        if (scholarshipsRes.ok) {
          const scholarshipsData = await scholarshipsRes.json();
          const schoolScholarships = (
            scholarshipsData.scholarships as Scholarship[]
          ).filter((s) => s.schoolId === found.id);
          setScholarships(schoolScholarships);
        }
      } catch (err) {
        console.error("Failed to load school:", err);
        setError("Unable to load school details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadSchoolData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-card-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Skeleton className="mb-4 h-10 w-3/4" />
          <Skeleton className="mb-2 h-5 w-1/3" />
          <Skeleton className="mb-8 h-5 w-1/4" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-card-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-2 text-sm text-text-muted">
              <Link
                href="/"
                className="hover:text-text-primary transition-colors"
              >
                Home
              </Link>
              <span>/</span>
              <Link
                href="/education/schools"
                className="hover:text-text-primary transition-colors"
              >
                Schools
              </Link>
            </nav>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
            <svg
              className="h-8 w-8 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            {error ?? "School not found"}
          </h1>
          <p className="mt-2 text-text-secondary">
            The school you are looking for may have been removed or does not
            exist.
          </p>
          <div className="mt-6">
            <Button href="/education/schools">Back to Schools</Button>
          </div>
        </div>
      </div>
    );
  }

  const location = [
    school.headOffice?.address,
    school.headOffice?.city,
    school.headOffice?.province,
    school.headOffice?.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-card-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-text-muted">
            <Link
              href="/"
              className="hover:text-text-primary transition-colors"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/education"
              className="hover:text-text-primary transition-colors"
            >
              Education
            </Link>
            <span>/</span>
            <Link
              href="/education/schools"
              className="hover:text-text-primary transition-colors"
            >
              Schools
            </Link>
            <span>/</span>
            <span className="text-text-primary line-clamp-1">
              {school.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 pb-24">
        {/* Back link */}
        <Link
          href="/education/schools"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Schools
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {school.type && (
              <Badge variant="info" className="capitalize">
                {school.type.replace(/_/g, " ")}
              </Badge>
            )}
            {school.verification?.indigenousControlled && (
              <Badge variant="success">Indigenous Controlled</Badge>
            )}
            {school.verification?.isVerified && (
              <Badge variant="default">Verified</Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
            {school.name}
          </h1>
          {location && (
            <div className="mt-2 flex items-center gap-1.5 text-text-secondary">
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <span>{location}</span>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {school.description && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  About
                </h2>
                <div className="text-text-secondary leading-relaxed whitespace-pre-line">
                  {school.description}
                </div>
              </section>
            )}

            {/* Mission */}
            {school.mission && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  Mission
                </h2>
                <Card>
                  <CardContent className="p-6 text-text-secondary leading-relaxed italic">
                    {school.mission}
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Programs */}
            {programs.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Programs ({programs.length})
                </h2>
                <div className="space-y-3">
                  {programs.map((program) => (
                    <Card key={program.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-text-primary truncate">
                            {program.name}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {program.level && (
                              <Badge variant="info" className="text-xs">
                                {program.level}
                              </Badge>
                            )}
                            {program.duration && (
                              <span className="text-xs text-text-muted">
                                {program.duration}
                              </span>
                            )}
                          </div>
                        </div>
                        {program.website && (
                          <Button
                            href={program.website}
                            external
                            variant="ghost"
                            size="sm"
                          >
                            View
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Scholarships */}
            {scholarships.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Scholarships ({scholarships.length})
                </h2>
                <div className="space-y-3">
                  {scholarships.map((scholarship) => (
                    <Link
                      key={scholarship.id}
                      href={`/education/scholarships/${scholarship.id}`}
                      className="block"
                    >
                      <Card className="transition-all hover:border-card-border-hover">
                        <CardContent className="p-4">
                          <h3 className="font-medium text-text-primary hover:text-accent transition-colors">
                            {scholarship.title}
                          </h3>
                          <div className="mt-1 flex items-center gap-3 text-sm text-text-muted">
                            {scholarship.amount && (
                              <span className="font-semibold text-accent">
                                {typeof scholarship.amount === "number"
                                  ? new Intl.NumberFormat("en-CA", {
                                      style: "currency",
                                      currency: "CAD",
                                      minimumFractionDigits: 0,
                                    }).format(scholarship.amount)
                                  : scholarship.amount}
                              </span>
                            )}
                            {scholarship.type && (
                              <Badge variant="default" className="text-xs">
                                {scholarship.type}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Support Services */}
            {school.supportServices && school.supportServices.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  Student Support Services
                </h2>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {school.supportServices.map((service) => (
                        <Badge key={service} variant="default">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Specializations */}
            {school.specializations && school.specializations.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  Specializations
                </h2>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {school.specializations.map((spec) => (
                        <Badge key={spec} variant="info">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* CTA */}
            {school.website && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Button
                    href={school.website}
                    external
                    size="lg"
                    fullWidth
                  >
                    Visit Website
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Contact Info */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Contact Information
                </h3>
                {school.headOffice?.phone && (
                  <div>
                    <p className="text-xs text-text-muted">Phone</p>
                    <a
                      href={`tel:${school.headOffice.phone}`}
                      className="text-sm text-accent hover:underline"
                    >
                      {school.headOffice.phone}
                    </a>
                  </div>
                )}
                {school.headOffice?.email && (
                  <div>
                    <p className="text-xs text-text-muted">Email</p>
                    <a
                      href={`mailto:${school.headOffice.email}`}
                      className="text-sm text-accent hover:underline"
                    >
                      {school.headOffice.email}
                    </a>
                  </div>
                )}
                {location && (
                  <div>
                    <p className="text-xs text-text-muted">Address</p>
                    <p className="text-sm text-text-primary">{location}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accreditations */}
            {school.accreditations && school.accreditations.length > 0 && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                    Accreditations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {school.accreditations.map((acc) => (
                      <Badge key={acc} variant="default">
                        {acc}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Campuses */}
            {school.campuses && school.campuses.length > 0 && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                    Campuses ({school.campuses.length})
                  </h3>
                  <div className="space-y-3">
                    {school.campuses.map((campus) => (
                      <div
                        key={campus.id}
                        className="border-b border-card-border pb-3 last:border-0 last:pb-0"
                      >
                        <p className="text-sm font-medium text-text-primary">
                          {campus.name}
                          {campus.isPrimary && (
                            <span className="ml-1 text-xs text-accent">
                              (Main)
                            </span>
                          )}
                        </p>
                        {(campus.city || campus.province) && (
                          <p className="text-xs text-text-muted">
                            {[campus.city, campus.province]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
