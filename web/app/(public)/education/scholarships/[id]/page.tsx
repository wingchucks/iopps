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
import type { Scholarship } from "@/lib/firestore/scholarships";

// ============================================
// HELPERS
// ============================================

function toDateSafe(
  value: Scholarship["deadline"],
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && value !== null) {
    if ("toDate" in value && typeof value.toDate === "function") {
      return value.toDate();
    }
    if ("_seconds" in value) {
      return new Date(
        (value as { _seconds: number })._seconds * 1000,
      );
    }
    if ("seconds" in value) {
      return new Date(
        (value as { seconds: number }).seconds * 1000,
      );
    }
  }
  return null;
}

function formatDeadline(value: Scholarship["deadline"]): string | null {
  const date = toDateSafe(value);
  if (!date) return null;
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(amount: Scholarship["amount"]): string | null {
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
}

function isExpired(value: Scholarship["deadline"]): boolean {
  const date = toDateSafe(value);
  if (!date) return false;
  return date < new Date();
}

// ============================================
// COMPONENT
// ============================================

export default function ScholarshipDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadScholarship() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/education/scholarships?limit=200&page=1&includeExpired=true`,
        );
        if (!res.ok) throw new Error("Failed to fetch scholarships");

        const data = await res.json();
        const found = (data.scholarships as Scholarship[]).find(
          (s) => s.id === id,
        );

        if (!found) {
          setError("Scholarship not found.");
        } else {
          setScholarship(found);
        }
      } catch (err) {
        console.error("Failed to load scholarship:", err);
        setError("Unable to load scholarship details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadScholarship();
  }, [id]);

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

  if (error || !scholarship) {
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
                href="/education/scholarships"
                className="hover:text-text-primary transition-colors"
              >
                Scholarships
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
            {error ?? "Scholarship not found"}
          </h1>
          <p className="mt-2 text-text-secondary">
            The scholarship you are looking for may have been removed or does not
            exist.
          </p>
          <div className="mt-6">
            <Button href="/education/scholarships">
              Back to Scholarships
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const deadlineFormatted = formatDeadline(scholarship.deadline);
  const expired = isExpired(scholarship.deadline);
  const formattedAmount = formatAmount(scholarship.amount);
  const applyUrl = scholarship.applicationUrl || scholarship.sourceUrl;

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
              href="/education/scholarships"
              className="hover:text-text-primary transition-colors"
            >
              Scholarships
            </Link>
            <span>/</span>
            <span className="text-text-primary line-clamp-1">
              {scholarship.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 pb-24">
        {/* Back link */}
        <Link
          href="/education/scholarships"
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
          Back to Scholarships
        </Link>

        {/* Header section */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {scholarship.type && (
              <Badge variant="default">{scholarship.type}</Badge>
            )}
            {scholarship.level && (
              <Badge variant="info">{scholarship.level}</Badge>
            )}
            {scholarship.region && (
              <Badge variant="default">{scholarship.region}</Badge>
            )}
            {expired && <Badge variant="warning">Expired</Badge>}
            {scholarship.isRecurring && (
              <Badge variant="success">Recurring</Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
            {scholarship.title}
          </h1>

          <p className="mt-2 text-lg text-accent font-medium">
            {scholarship.provider}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Amount and Deadline card */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  {formattedAmount && (
                    <div>
                      <p className="text-sm font-medium text-text-muted mb-1">
                        Award Amount
                      </p>
                      <p className="text-2xl font-bold text-accent">
                        {formattedAmount}
                      </p>
                    </div>
                  )}
                  {deadlineFormatted && (
                    <div>
                      <p className="text-sm font-medium text-text-muted mb-1">
                        Application Deadline
                      </p>
                      <p
                        className={`text-lg font-semibold ${expired ? "text-error" : "text-text-primary"}`}
                      >
                        {expired ? "Expired" : deadlineFormatted}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {scholarship.description && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  About This Scholarship
                </h2>
                <div className="prose text-text-secondary leading-relaxed whitespace-pre-line">
                  {scholarship.description}
                </div>
              </section>
            )}

            {/* Eligibility */}
            {scholarship.eligibility && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  Eligibility Criteria
                </h2>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {scholarship.eligibility.indigenousStatus &&
                      scholarship.eligibility.indigenousStatus.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-text-muted mb-1">
                            Indigenous Status
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {scholarship.eligibility.indigenousStatus.map(
                              (status) => (
                                <Badge key={status} variant="default">
                                  {status}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    {scholarship.eligibility.studyLevel &&
                      scholarship.eligibility.studyLevel.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-text-muted mb-1">
                            Study Level
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {scholarship.eligibility.studyLevel.map((lvl) => (
                              <Badge key={lvl} variant="info">
                                {lvl}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {scholarship.eligibility.fieldsOfStudy &&
                      scholarship.eligibility.fieldsOfStudy.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-text-muted mb-1">
                            Fields of Study
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {scholarship.eligibility.fieldsOfStudy.map(
                              (field) => (
                                <Badge key={field} variant="default">
                                  {field}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    {scholarship.eligibility.provinces &&
                      scholarship.eligibility.provinces.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-text-muted mb-1">
                            Provinces
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {scholarship.eligibility.provinces.map(
                              (province) => (
                                <Badge key={province} variant="default">
                                  {province}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    {scholarship.eligibility.gpaRequirement && (
                      <div>
                        <p className="text-sm font-medium text-text-muted mb-1">
                          Minimum GPA
                        </p>
                        <p className="text-text-primary font-semibold">
                          {scholarship.eligibility.gpaRequirement}
                        </p>
                      </div>
                    )}
                    {scholarship.eligibility.financialNeed && (
                      <div>
                        <p className="text-sm text-text-secondary">
                          Financial need may be considered in the selection
                          process.
                        </p>
                      </div>
                    )}
                    {scholarship.eligibility.otherRequirements &&
                      scholarship.eligibility.otherRequirements.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-text-muted mb-1">
                            Other Requirements
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
                            {scholarship.eligibility.otherRequirements.map(
                              (req, i) => (
                                <li key={i}>{req}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </section>
            )}

            {/* How to Apply */}
            {(scholarship.applicationInstructions ||
              scholarship.applicationProcess ||
              scholarship.applicationMethod) && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  How to Apply
                </h2>
                <Card>
                  <CardContent className="p-6">
                    {scholarship.applicationMethod && (
                      <p className="mb-3 text-sm text-text-muted">
                        <span className="font-medium">Method:</span>{" "}
                        {scholarship.applicationMethod}
                      </p>
                    )}
                    <div className="text-text-secondary leading-relaxed whitespace-pre-line">
                      {scholarship.applicationInstructions ||
                        scholarship.applicationProcess}
                    </div>
                    {scholarship.applicationEmail && (
                      <p className="mt-4 text-sm text-text-secondary">
                        <span className="font-medium text-text-muted">
                          Email:
                        </span>{" "}
                        <a
                          href={`mailto:${scholarship.applicationEmail}`}
                          className="text-accent hover:underline"
                        >
                          {scholarship.applicationEmail}
                        </a>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Recurring schedule */}
            {scholarship.isRecurring && scholarship.recurringSchedule && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <svg
                    className="h-5 w-5 text-info shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                    />
                  </svg>
                  <p className="text-sm text-info font-medium">
                    This is a recurring scholarship: {scholarship.recurringSchedule}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply CTA */}
            <Card>
              <CardContent className="p-6 text-center">
                {applyUrl && !expired ? (
                  <>
                    <Button
                      href={applyUrl}
                      external
                      size="lg"
                      fullWidth
                    >
                      Apply Now
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
                    <p className="mt-2 text-xs text-text-muted">
                      Opens in a new tab
                    </p>
                  </>
                ) : expired ? (
                  <div>
                    <p className="text-sm font-medium text-error mb-2">
                      This scholarship deadline has passed.
                    </p>
                    {scholarship.isRecurring && (
                      <p className="text-xs text-text-muted">
                        This scholarship recurs{" "}
                        {scholarship.recurringSchedule
                          ? scholarship.recurringSchedule.toLowerCase()
                          : "periodically"}
                        . Check back for the next cycle.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    No application link available. Contact the provider directly.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick info */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Details
                </h3>
                {scholarship.provider && (
                  <div>
                    <p className="text-xs text-text-muted">Provider</p>
                    <p className="text-sm font-medium text-text-primary">
                      {scholarship.provider}
                    </p>
                  </div>
                )}
                {scholarship.providerType && (
                  <div>
                    <p className="text-xs text-text-muted">Provider Type</p>
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {scholarship.providerType}
                    </p>
                  </div>
                )}
                {scholarship.type && (
                  <div>
                    <p className="text-xs text-text-muted">Award Type</p>
                    <p className="text-sm font-medium text-text-primary">
                      {scholarship.type}
                    </p>
                  </div>
                )}
                {scholarship.level && (
                  <div>
                    <p className="text-xs text-text-muted">Education Level</p>
                    <p className="text-sm font-medium text-text-primary">
                      {scholarship.level}
                    </p>
                  </div>
                )}
                {scholarship.region && (
                  <div>
                    <p className="text-xs text-text-muted">Region</p>
                    <p className="text-sm font-medium text-text-primary">
                      {scholarship.region}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
