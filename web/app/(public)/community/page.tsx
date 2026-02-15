"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Input,
  Select,
  Badge,
  Button,
  Skeleton,
  EmptyState,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Types (client-side shape matching API response)
// ---------------------------------------------------------------------------

interface PowwowEvent {
  id: string;
  name: string;
  host?: string;
  location: string;
  region?: string;
  eventType?: string;
  season?: string;
  startDate?: string | null;
  endDate?: string | null;
  dateRange?: string;
  description: string;
  registrationStatus?: string;
  livestream?: boolean;
  imageUrl?: string;
  featured?: boolean;
  active: boolean;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION_OPTIONS = [
  { label: "All Regions", value: "" },
  { label: "Alberta", value: "Alberta" },
  { label: "British Columbia", value: "British Columbia" },
  { label: "Manitoba", value: "Manitoba" },
  { label: "New Brunswick", value: "New Brunswick" },
  { label: "Newfoundland and Labrador", value: "Newfoundland and Labrador" },
  { label: "Northwest Territories", value: "Northwest Territories" },
  { label: "Nova Scotia", value: "Nova Scotia" },
  { label: "Nunavut", value: "Nunavut" },
  { label: "Ontario", value: "Ontario" },
  { label: "Prince Edward Island", value: "Prince Edward Island" },
  { label: "Quebec", value: "Quebec" },
  { label: "Saskatchewan", value: "Saskatchewan" },
  { label: "Yukon", value: "Yukon" },
];

const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  dateRange: string | undefined,
): string {
  if (dateRange) return dateRange;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && end) {
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return `${start.toLocaleDateString("en-CA", opts)} - ${end.toLocaleDateString("en-CA", opts)}`;
  }

  if (start) {
    return start.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return "Date TBD";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommunityPage() {
  const [powwows, setPowwows] = useState<PowwowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPowwows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(PAGE_SIZE));
      if (region) params.set("province", region);

      const res = await fetch(`/api/community/powwows?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setPowwows(data.powwows ?? []);
      setPagination(data.pagination ?? null);
    } catch (error) {
      console.error("Error fetching pow wows:", error);
      setPowwows([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, region]);

  useEffect(() => {
    fetchPowwows();
  }, [fetchPowwows]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [region]);

  // Client-side search filtering
  const filteredPowwows = search.trim()
    ? powwows.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.location.toLowerCase().includes(search.toLowerCase()) ||
          (p.host && p.host.toLowerCase().includes(search.toLowerCase())),
      )
    : powwows;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 pb-24">
        {/* Hero Section */}
        <section className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
            Pow Wows &amp; Community Events
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
            Celebrations, conferences, and gatherings across Turtle Island.
            Connect with your community and honor our traditions.
          </p>
        </section>

        {/* Filters */}
        <section className="mb-8 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search by name, location, or host..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              options={REGION_OPTIONS}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Filter by region"
            />
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="mb-3 h-6 w-3/4" />
                  <Skeleton className="mb-2 h-4 w-1/2" />
                  <Skeleton className="mb-2 h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPowwows.length === 0 && (
          <EmptyState
            title="No pow wows found"
            description={
              search || region
                ? "Try adjusting your search or filters."
                : "No events scheduled right now. Check back soon!"
            }
            icon={
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            }
          />
        )}

        {/* Pow Wow Cards Grid */}
        {!loading && filteredPowwows.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPowwows.map((powwow) => (
              <Link
                key={powwow.id}
                href={`/community/${powwow.id}`}
                className="group"
              >
                <Card className="h-full transition-all duration-200 hover:border-card-border-hover hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                        {powwow.name}
                      </h2>
                      {powwow.featured && (
                        <Badge variant="warning" className="shrink-0">
                          Featured
                        </Badge>
                      )}
                    </div>

                    {powwow.host && (
                      <p className="mb-1 text-sm text-accent">{powwow.host}</p>
                    )}

                    <div className="mb-3 flex items-center gap-1.5 text-sm text-text-secondary">
                      <svg
                        className="h-4 w-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                        />
                      </svg>
                      <span>
                        {formatDateRange(
                          powwow.startDate,
                          powwow.endDate,
                          powwow.dateRange,
                        )}
                      </span>
                    </div>

                    <div className="mb-3 flex items-center gap-1.5 text-sm text-text-secondary">
                      <svg
                        className="h-4 w-4 shrink-0"
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
                      <span className="line-clamp-1">{powwow.location}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {powwow.region && (
                        <Badge variant="info">{powwow.region}</Badge>
                      )}
                      {powwow.eventType && (
                        <Badge>{powwow.eventType}</Badge>
                      )}
                      {powwow.livestream && (
                        <Badge variant="success">Live Stream</Badge>
                      )}
                    </div>

                    {powwow.description && (
                      <p className="mt-3 text-sm text-text-muted line-clamp-2">
                        {powwow.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination && pagination.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* CTA Section */}
        <section className="mt-16 rounded-2xl border border-card-border bg-card p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-text-primary">
            Hosting an Event?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-text-secondary">
            List your pow wow, conference, or cultural gathering and reach
            Indigenous communities across Turtle Island.
          </p>
          <div className="mt-6">
            <Button href="/contact" size="lg">
              Contact Us to List Your Event
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
