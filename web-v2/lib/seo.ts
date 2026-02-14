/**
 * SEO utilities
 *
 * This module will provide:
 * - generateOrganizationSchema() - JSON-LD Organization structured data
 * - generateWebsiteSchema() - JSON-LD WebSite structured data
 * - generateJobPostingSchema() - JSON-LD JobPosting for job listings
 * - generateEventSchema() - JSON-LD Event for conferences/pow wows
 * - generateBreadcrumbSchema() - JSON-LD BreadcrumbList
 * - buildMetadata() - Helper to build page-specific Next.js Metadata objects
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";

// TODO: Implement SEO schema generators
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "IOPPS",
    url: SITE_URL,
    description:
      "Indigenous Opportunities & Partnerships Platform - Empowering Indigenous success across Canada.",
  };
}

export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "IOPPS",
    url: SITE_URL,
  };
}
