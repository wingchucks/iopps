import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";
const SITE_NAME = "IOPPS.ca";
const DEFAULT_TITLE = "IOPPS.ca — Empowering Indigenous Success";
const DEFAULT_DESCRIPTION =
  "IOPPS.ca — Empowering Indigenous Success. Jobs, education, business, conferences, events, and livestreams for Indigenous communities across Canada.";
const DEFAULT_OG_IMAGE = "/og/default.png";

export type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
};

export function buildMetadata(input: SeoInput = {}): Metadata {
  const { title, description, path = "/", image, type = "website", noIndex = false } = input;
  const canonicalUrl = new URL(path, SITE_URL).toString();
  const ogImageUrl = image
    ? image.startsWith("http") ? image : new URL(image, SITE_URL).toString()
    : new URL(DEFAULT_OG_IMAGE, SITE_URL).toString();
  const truncatedDescription =
    (description || DEFAULT_DESCRIPTION).length > 160
      ? (description || DEFAULT_DESCRIPTION).slice(0, 157) + "..."
      : description || DEFAULT_DESCRIPTION;
  const finalTitle = title || DEFAULT_TITLE;

  return {
    title: finalTitle,
    description: truncatedDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: finalTitle,
      description: truncatedDescription,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type,
      locale: "en_CA",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: finalTitle }],
      ...(input.publishedTime && { publishedTime: input.publishedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: truncatedDescription,
      images: [ogImageUrl],
      creator: "@ioppsca",
    },
    ...(noIndex && {
      robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    }),
  };
}

export function buildOgImageUrl(params: {
  title: string;
  subtitle?: string;
  type?: string;
  image?: string;
}): string {
  const searchParams = new URLSearchParams();
  searchParams.set("title", params.title);
  if (params.subtitle) searchParams.set("subtitle", params.subtitle);
  if (params.type) searchParams.set("type", params.type);
  if (params.image) searchParams.set("image", params.image);
  return `/api/og?${searchParams.toString()}`;
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "IOPPS",
    alternateName: "Indigenous Opportunities & Partnerships Platform",
    url: "https://iopps.ca",
    logo: "https://iopps.ca/logo.png",
    description: "Empowering Indigenous success across Canada through jobs, conferences, scholarships, pow wows, Indigenous-owned businesses, and live streams.",
    foundingDate: "2024",
    address: { "@type": "PostalAddress", addressCountry: "CA" },
    sameAs: ["https://twitter.com/ioppsca", "https://facebook.com/ioppsca", "https://instagram.com/ioppsca"],
    contactPoint: { "@type": "ContactPoint", email: "nathan.arias@iopps.ca", contactType: "Customer Service", areaServed: "CA" },
  };
}

export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "IOPPS",
    url: "https://iopps.ca",
    description: "Canada's platform for Indigenous employment, scholarships, conferences, and business opportunities.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: "https://iopps.ca/jobs?search={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateJobPostingSchema(job: {
  title: string; description: string; employerName?: string; location: string;
  employmentType: string; salaryRange?: string; closingDate?: string | Date;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    hiringOrganization: { "@type": "Organization", name: job.employerName || "IOPPS Employer" },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "CA" } },
    employmentType: job.employmentType.toUpperCase(),
    ...(job.salaryRange && { baseSalary: { "@type": "MonetaryAmount", currency: "CAD", value: { "@type": "QuantitativeValue", value: job.salaryRange } } }),
    ...(job.closingDate && { validThrough: new Date(job.closingDate).toISOString() }),
  };
}

export function generateEventSchema(event: {
  name: string; description: string; startDate: string | Date; endDate?: string | Date;
  location: string; organizer?: string; url?: string; image?: string; eventType?: "Conference" | "Event" | "Festival";
}) {
  return {
    "@context": "https://schema.org",
    "@type": event.eventType || "Event",
    name: event.name,
    description: event.description,
    startDate: new Date(event.startDate).toISOString(),
    ...(event.endDate && { endDate: new Date(event.endDate).toISOString() }),
    location: { "@type": "Place", name: event.location, address: { "@type": "PostalAddress", addressLocality: event.location, addressCountry: "CA" } },
    ...(event.organizer && { organizer: { "@type": "Organization", name: event.organizer } }),
    ...(event.url && { url: event.url }),
    ...(event.image && { image: event.image }),
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://iopps.ca${item.url}`,
    })),
  };
}

export function generateScholarshipSchema(scholarship: {
  name: string; description: string; provider: string; amount?: string;
  deadline?: string | Date; eligibility?: string; url?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    name: scholarship.name,
    description: scholarship.description,
    credentialCategory: "scholarship",
    offers: {
      "@type": "Offer",
      ...(scholarship.amount && { price: scholarship.amount, priceCurrency: "CAD" }),
      ...(scholarship.deadline && { validThrough: new Date(scholarship.deadline).toISOString() }),
    },
    recognizedBy: { "@type": "Organization", name: scholarship.provider },
    ...(scholarship.eligibility && { competencyRequired: scholarship.eligibility }),
    ...(scholarship.url && { url: scholarship.url }),
  };
}

export function generateLocalBusinessSchema(business: {
  name: string; description: string; category?: string; region?: string; url?: string; image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description,
    ...(business.category && { "@additionalType": business.category }),
    address: { "@type": "PostalAddress", addressRegion: business.region || "Canada", addressCountry: "CA" },
    ...(business.url && { url: business.url }),
    ...(business.image && { image: business.image }),
  };
}

export function generatePowwowSchema(powwow: {
  name: string; description: string; startDate?: string | Date | null; endDate?: string | Date | null;
  location: string; host?: string; url?: string; image?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Festival",
    name: powwow.name,
    description: powwow.description,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: powwow.location, address: { "@type": "PostalAddress", addressLocality: powwow.location } },
  };
  if (powwow.startDate) schema.startDate = new Date(powwow.startDate).toISOString();
  if (powwow.endDate) schema.endDate = new Date(powwow.endDate).toISOString();
  if (powwow.host) schema.organizer = { "@type": "Organization", name: powwow.host };
  if (powwow.url) schema.url = powwow.url;
  if (powwow.image) schema.image = powwow.image;
  return schema;
}
