import type { Metadata } from "next";

export const SITE_NAME = "IOPPS.ca";
export const SITE_URL = "https://www.iopps.ca";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

type ListingMetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: string;
};

type JobSchemaInput = {
  slug: string;
  title: string;
  description?: string;
  employerName?: string;
  location?: string | { city?: string; province?: string; state?: string; country?: string; address?: string };
  datePosted?: string;
  closingDate?: string;
  employmentType?: string;
  salary?: string;
};

type EventSchemaInput = {
  slug: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string | { city?: string; province?: string; state?: string; country?: string; venue?: string; address?: string };
  venue?: string;
  organizer?: string;
  image?: string;
};

type TrainingSchemaInput = {
  slug: string;
  title: string;
  description?: string;
  provider?: string;
  location?: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function stripHtml(input?: string): string {
  return clean(input).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncate(input: string, max = 190): string {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl.replace("https://iopps.ca", SITE_URL);
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path}`;
}

function titleWithSite(title: string): string {
  const cleaned = clean(title) || "IOPPS";
  return cleaned.includes("IOPPS") ? cleaned : `${cleaned} | ${SITE_NAME}`;
}

export function buildListingMetadata(input: ListingMetadataInput): Metadata {
  const title = titleWithSite(input.title);
  const description = truncate(stripHtml(input.description) || "Find jobs, events, training, scholarships, businesses, and community opportunities across Canada, for Indigenous people.", 180);
  const url = absoluteUrl(input.path);
  const image = input.image ? absoluteUrl(input.image) : DEFAULT_OG_IMAGE;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: input.type || "article",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

function parseRegion(location: unknown): string | undefined {
  if (typeof location === "object" && location) {
    const record = location as Record<string, unknown>;
    return clean(record.province) || clean(record.state) || undefined;
  }
  const text = clean(location);
  const match = text.match(/\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b/i);
  return match?.[1]?.toUpperCase();
}

function parseLocality(location: unknown): string | undefined {
  if (typeof location === "object" && location) {
    const record = location as Record<string, unknown>;
    return clean(record.city) || undefined;
  }
  const text = clean(location);
  if (!text) return undefined;
  return text.split(/[,/]/)[0]?.trim() || undefined;
}

function postalAddress(location: unknown) {
  return {
    "@type": "PostalAddress",
    addressLocality: parseLocality(location),
    addressRegion: parseRegion(location),
    addressCountry: "CA",
  };
}

export function buildJobPostingJsonLd(input: JobSchemaInput) {
  const title = clean(input.title) || "Job Opportunity";
  const employerName = clean(input.employerName) || "IOPPS employer";
  const description = stripHtml(input.description) || `${title} at ${employerName}. View details and application steps on IOPPS.ca.`;
  const url = absoluteUrl(`/jobs/${input.slug}`);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title,
    description,
    url,
    hiringOrganization: {
      "@type": "Organization",
      name: employerName,
    },
    jobLocation: {
      "@type": "Place",
      address: postalAddress(input.location),
    },
  };

  const datePosted = clean(input.datePosted);
  const closingDate = clean(input.closingDate);
  const employmentType = clean(input.employmentType);
  const salary = clean(input.salary);
  if (datePosted) jsonLd.datePosted = datePosted;
  if (closingDate) jsonLd.validThrough = closingDate;
  if (employmentType) jsonLd.employmentType = employmentType;
  if (salary) jsonLd.baseSalary = salary;
  return jsonLd;
}

export function buildEventJsonLd(input: EventSchemaInput) {
  const title = clean(input.title) || "IOPPS Event";
  const description = stripHtml(input.description) || `${title}. View event details on IOPPS.ca.`;
  const locationName = clean(input.venue) || (typeof input.location === "object" ? clean(input.location.venue) : "") || clean(input.location) || "Event location";
  const organizer = clean(input.organizer) || locationName;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: title,
    description,
    url: absoluteUrl(`/events/${input.slug}`),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: locationName,
      address: postalAddress(input.location),
    },
    organizer: {
      "@type": "Organization",
      name: organizer,
    },
  };
  if (clean(input.startDate)) jsonLd.startDate = clean(input.startDate);
  if (clean(input.endDate)) jsonLd.endDate = clean(input.endDate);
  if (clean(input.image)) jsonLd.image = [absoluteUrl(clean(input.image))];
  return jsonLd;
}

export function buildTrainingCourseJsonLd(input: TrainingSchemaInput) {
  const title = clean(input.title) || "IOPPS Training";
  const provider = clean(input.provider) || "IOPPS";
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: title,
    description: stripHtml(input.description) || `${title}. View training details on IOPPS.ca.`,
    url: absoluteUrl(`/training/${input.slug}`),
    provider: {
      "@type": "Organization",
      name: provider,
    },
    courseMode: clean(input.location).toLowerCase().includes("online") ? "online" : undefined,
  };
}
