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

interface Organization {
  id: string;
  organizationName: string;
  slug?: string;
  orgType?: string;
  description?: string;
  tagline?: string;
  website?: string;
  location?: string;
  province?: string;
  city?: string;
  nation?: string;
  logoUrl?: string;
  bannerUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  links?: {
    website?: string;
    email?: string;
    phone?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  sector?: string;
  size?: string;
  yearEstablished?: number;
  territory?: string;
}

interface Job {
  id: string;
  title: string;
  location?: string;
  employmentType?: string;
  createdAt?: unknown;
}

export default function OrganizationProfilePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/organizations/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Organization not found.");
          } else {
            throw new Error("Failed to fetch organization");
          }
          setLoading(false);
          return;
        }
        const data = await res.json();
        setOrganization(data.organization);
        setJobs(data.jobs ?? []);
      } catch (err) {
        console.error("Failed to load organization:", err);
        setError("Unable to load organization details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
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

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-card-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-2 text-sm text-text-muted">
              <Link href="/" className="hover:text-text-primary transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-text-primary">Organizations</span>
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
            {error ?? "Organization not found"}
          </h1>
          <p className="mt-2 text-text-secondary">
            The organization you are looking for may have been removed or does not exist.
          </p>
          <div className="mt-6">
            <Button href="/">Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const locationStr = [organization.city, organization.province, organization.nation]
    .filter(Boolean)
    .join(", ") || organization.location;

  const socials = organization.links || organization.socialLinks || {};

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-card-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-text-muted">
            <Link href="/" className="hover:text-text-primary transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-text-primary line-clamp-1">
              {organization.organizationName}
            </span>
          </nav>
        </div>
      </div>

      {/* Banner */}
      {organization.bannerUrl && (
        <div className="relative h-48 w-full overflow-hidden bg-surface sm:h-64">
          <img
            src={organization.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.organizationName}
                className="h-16 w-16 shrink-0 rounded-lg object-cover border border-card-border"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent text-2xl font-bold">
                {organization.organizationName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {organization.orgType && (
                  <Badge variant="info" className="capitalize">
                    {organization.orgType.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
                {organization.organizationName}
              </h1>
              {organization.tagline && (
                <p className="mt-1 text-lg text-text-secondary">{organization.tagline}</p>
              )}
              {locationStr && (
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
                  <span>{locationStr}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {organization.description && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">About</h2>
                <div className="text-text-secondary leading-relaxed whitespace-pre-line">
                  {organization.description}
                </div>
              </section>
            )}

            {/* Active Jobs */}
            {jobs.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Open Positions ({jobs.length})
                </h2>
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <Link key={job.id} href={`/careers/jobs/${job.id}`} className="block">
                      <Card className="transition-all hover:border-card-border-hover">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-text-primary hover:text-accent transition-colors truncate">
                              {job.title}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {job.location && (
                                <span className="text-xs text-text-muted">{job.location}</span>
                              )}
                              {job.employmentType && (
                                <Badge variant="default" className="text-xs">
                                  {job.employmentType}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <svg
                            className="h-5 w-5 shrink-0 text-text-muted"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8.25 4.5l7.5 7.5-7.5 7.5"
                            />
                          </svg>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Website CTA */}
            {(organization.website || organization.links?.website) && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Button
                    href={organization.website || organization.links?.website}
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
                  Details
                </h3>
                {organization.contactEmail && (
                  <div>
                    <p className="text-xs text-text-muted">Email</p>
                    <a
                      href={`mailto:${organization.contactEmail}`}
                      className="text-sm text-accent hover:underline"
                    >
                      {organization.contactEmail}
                    </a>
                  </div>
                )}
                {organization.contactPhone && (
                  <div>
                    <p className="text-xs text-text-muted">Phone</p>
                    <a
                      href={`tel:${organization.contactPhone}`}
                      className="text-sm text-accent hover:underline"
                    >
                      {organization.contactPhone}
                    </a>
                  </div>
                )}
                {organization.sector && (
                  <div>
                    <p className="text-xs text-text-muted">Sector</p>
                    <p className="text-sm text-text-primary">{organization.sector}</p>
                  </div>
                )}
                {organization.size && (
                  <div>
                    <p className="text-xs text-text-muted">Company Size</p>
                    <p className="text-sm text-text-primary">{organization.size}</p>
                  </div>
                )}
                {organization.yearEstablished && (
                  <div>
                    <p className="text-xs text-text-muted">Established</p>
                    <p className="text-sm text-text-primary">{organization.yearEstablished}</p>
                  </div>
                )}
                {organization.territory && (
                  <div>
                    <p className="text-xs text-text-muted">Territory</p>
                    <p className="text-sm text-text-primary">{organization.territory}</p>
                  </div>
                )}
                {locationStr && (
                  <div>
                    <p className="text-xs text-text-muted">Location</p>
                    <p className="text-sm text-text-primary">{locationStr}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Links */}
            {Object.values(socials).some(Boolean) && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                    Connect
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(socials).map(([platform, url]) =>
                      url && platform !== "website" && platform !== "email" && platform !== "phone" ? (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Badge variant="default" className="capitalize hover:bg-accent/10 transition-colors">
                            {platform}
                          </Badge>
                        </a>
                      ) : null,
                    )}
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
