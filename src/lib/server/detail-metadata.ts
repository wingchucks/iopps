import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  buildEventJsonLd,
  buildJobPostingJsonLd,
  buildListingMetadata,
  buildTrainingCourseJsonLd,
  stripHtml,
  truncate,
} from "@/lib/server/seo";

type JsonLd = Record<string, unknown>;

type EntityLookup = {
  collections: readonly string[];
  slugFields?: readonly string[];
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function findFirst(
  collections: readonly string[],
  slug: string,
  slugFields: readonly string[] = ["slug"],
): Promise<Record<string, unknown> | null> {
  const db = getAdminDb();
  if (!db) return null;
  for (const name of collections) {
    try {
      const direct = await db.collection(name).doc(slug).get();
      if (direct.exists) return { id: direct.id, ...(direct.data() || {}) };
      for (const field of slugFields) {
        const q = await db.collection(name).where(field, "==", slug).limit(1).get();
        if (!q.empty) {
          const d = q.docs[0];
          return { id: d.id, ...(d.data() || {}) };
        }
      }
    } catch {
      // Continue — another collection may resolve it.
    }
  }
  return null;
}

function field(record: Record<string, unknown>, ...names: string[]): string {
  for (const name of names) {
    const value = clean(record[name]);
    if (value) return value;
  }
  return "";
}

export function fallbackMetadata(title: string, description: string, path = "/"): Metadata {
  const metadata = buildListingMetadata({
    title,
    description,
    path,
    type: "website",
  });
  return { ...metadata, robots: { index: false, follow: false } };
}

export async function generateJobMetadata(slug: string): Promise<Metadata> {
  const lookup: EntityLookup = { collections: ["jobs", "posts"] };
  const job = await findFirst(lookup.collections, slug, lookup.slugFields);
  if (!job) {
    return buildListingMetadata({
      title: "Job Opportunity",
      description: "View full job details, requirements, and application instructions for this Indigenous career opportunity on IOPPS.ca.",
      path: `/jobs/${slug}`,
      type: "article",
    });
  }
  const title = field(job, "title") || "Job Opportunity";
  const employer = field(job, "employerName", "orgName", "companyName", "company", "organization");
  const location = field(job, "location", "locationProvince");
  const closingDate = field(job, "closingDate", "deadline", "expiresAt");
  const facts = [employer, location, closingDate ? `Closing ${closingDate}` : ""].filter(Boolean).join(" · ");
  const description = truncate(
    facts
      ? `${title} · ${facts}. ${stripHtml(clean(job.description))}`
      : `${title}. ${stripHtml(clean(job.description))}`,
  );
  return buildListingMetadata({
    title: employer ? `${title} — ${employer}` : title,
    description: description || "View full job details on IOPPS.ca.",
    path: `/jobs/${slug}`,
    type: "article",
  });
}

export async function generateJobJsonLd(slug: string): Promise<JsonLd | null> {
  const job = await findFirst(["jobs", "posts"], slug);
  if (!job) return null;
  return buildJobPostingJsonLd({
    slug,
    title: field(job, "title") || "Job Opportunity",
    description: clean(job.description),
    employerName: field(job, "employerName", "orgName", "companyName", "company", "organization"),
    location: job.location || field(job, "locationProvince"),
    datePosted: field(job, "datePosted", "postedAt", "publishedAt", "createdAt"),
    closingDate: field(job, "closingDate", "deadline", "expiresAt"),
    employmentType: field(job, "employmentType", "jobType"),
    salary: field(job, "salary"),
  });
}

export async function generateEventMetadata(slug: string): Promise<Metadata> {
  const lookup: EntityLookup = { collections: ["events", "posts"] };
  const event = await findFirst(lookup.collections, slug, lookup.slugFields);
  if (!event) {
    return buildListingMetadata({
      title: "Event",
      description: "View event details, schedule, and RSVP for this Indigenous community gathering, pow wow, or career fair on IOPPS.ca.",
      path: `/events/${slug}`,
      type: "article",
    });
  }
  const title = field(event, "title") || "Event";
  const dates = field(event, "dates", "date", "startDate");
  const location = field(event, "location", "venue");
  const host = field(event, "orgName", "organizerName", "nation", "venue");
  const leading = [dates, location, host].filter(Boolean).join(" · ");
  return buildListingMetadata({
    title: dates ? `${title} — ${dates}` : title,
    description: truncate(
      leading
        ? `${title} · ${leading}. ${stripHtml(clean(event.description))}`
        : `${title}. ${stripHtml(clean(event.description))}`,
    ) || "View event details on IOPPS.ca.",
    path: `/events/${slug}`,
    type: "article",
    image: field(event, "imageUrl", "posterUrl"),
  });
}

export async function generateEventJsonLd(slug: string): Promise<JsonLd | null> {
  const event = await findFirst(["events", "posts"], slug);
  if (!event) return null;
  return buildEventJsonLd({
    slug,
    title: field(event, "title") || "Event",
    description: clean(event.description),
    startDate: field(event, "startDate", "date"),
    endDate: field(event, "endDate"),
    location: event.location || field(event, "venue"),
    venue: field(event, "venue"),
    organizer: field(event, "orgName", "organizerName", "nation", "venue"),
    image: field(event, "imageUrl", "posterUrl"),
  });
}

export async function generateOrgMetadata(slug: string): Promise<Metadata> {
  const lookup: EntityLookup = { collections: ["organizations", "employers"] };
  const org = await findFirst(lookup.collections, slug, lookup.slugFields);
  if (!org) {
    return fallbackMetadata(
      "Organization Profile",
      "View this organization's profile, open positions, and details on IOPPS — Canada's Indigenous professional platform.",
      `/org/${slug}`,
    );
  }
  const name = clean(org.name) || "Organization";
  const tagline = clean(org.tagline);
  return buildListingMetadata({
    title: name,
    description: truncate(tagline || stripHtml(clean(org.description)) || `${name} on IOPPS.ca.`),
    path: `/org/${slug}`,
    type: "article",
  });
}

export async function generateSchoolMetadata(slug: string): Promise<Metadata> {
  const lookup: EntityLookup = { collections: ["organizations"] };
  const school = await findFirst(lookup.collections, slug, lookup.slugFields);
  if (!school) {
    return fallbackMetadata(
      "School Profile",
      "View this school's programs, scholarships, and career opportunities for Indigenous students on IOPPS.",
      `/schools/${slug}`,
    );
  }
  const name = clean(school.name) || "School";
  return buildListingMetadata({
    title: `${name} | Schools`,
    description: truncate(stripHtml(clean(school.description)) || `Programs, scholarships, and careers at ${name} on IOPPS.ca.`),
    path: `/schools/${slug}`,
    type: "article",
  });
}

export async function generateProgramMetadata(slug: string): Promise<Metadata> {
  return generateTrainingMetadata(slug, "/programs");
}

export async function generateTrainingMetadata(slug: string, routePrefix = "/training"): Promise<Metadata> {
  const lookup: EntityLookup = { collections: ["training_programs", "training", "programs", "posts"] };
  const program = await findFirst(lookup.collections, slug, lookup.slugFields);
  if (!program) {
    return buildListingMetadata({
      title: routePrefix === "/training" ? "Training" : "Program",
      description: "View training program details, credentials, and enrollment information on IOPPS.ca.",
      path: `${routePrefix}/${slug}`,
      type: "article",
    });
  }
  const name = field(program, "title", "programName") || "Training";
  const provider = field(program, "institutionName", "provider", "orgName", "ownerName");
  return buildListingMetadata({
    title: provider ? `${name} — ${provider}` : name,
    description: truncate(stripHtml(clean(program.description)) || `${name} on IOPPS.ca.`),
    path: `${routePrefix}/${slug}`,
    type: "article",
  });
}

export async function generateTrainingJsonLd(slug: string): Promise<JsonLd | null> {
  const program = await findFirst(["training_programs", "training", "programs", "posts"], slug);
  if (!program) return null;
  return buildTrainingCourseJsonLd({
    slug,
    title: field(program, "title", "programName") || "Training",
    description: clean(program.description),
    provider: field(program, "institutionName", "provider", "orgName", "ownerName"),
    location: field(program, "location", "format"),
  });
}

export async function generateStoryMetadata(slug: string): Promise<Metadata> {
  const story = await findFirst(["posts"], slug) ||
    await findFirst(["posts"], `story-${slug}`) ||
    await findFirst(["posts"], `spotlight-${slug}`);
  if (!story) return fallbackMetadata("Story", "Read this story on IOPPS.ca.", `/stories/${slug}`);
  const title = field(story, "title", "headline") || "IOPPS Story";
  return buildListingMetadata({
    title,
    description: truncate(stripHtml(field(story, "excerpt", "description", "content")) || `${title} on IOPPS.ca.`),
    path: `/stories/${slug}`,
    type: "article",
    image: field(story, "imageUrl", "coverImage", "thumbnailUrl"),
  });
}

export async function generateStoryJsonLd(slug: string): Promise<JsonLd | null> {
  const story = await findFirst(["posts"], slug) ||
    await findFirst(["posts"], `story-${slug}`) ||
    await findFirst(["posts"], `spotlight-${slug}`);
  if (!story) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: field(story, "title", "headline") || "IOPPS Story",
    description: truncate(stripHtml(field(story, "excerpt", "description", "content"))),
    url: `https://www.iopps.ca/stories/${encodeURIComponent(slug)}`,
    image: field(story, "imageUrl", "coverImage", "thumbnailUrl") || undefined,
  };
}

export async function generateShopMetadata(slug: string): Promise<Metadata> {
  const vendor = await findFirst(["shop_vendors"], slug);
  if (!vendor) return fallbackMetadata("Shop Listing", "View this Indigenous business listing on IOPPS.ca.", `/shop/${slug}`);
  const name = field(vendor, "name", "businessName", "title") || "Indigenous Business";
  return buildListingMetadata({
    title: name,
    description: truncate(stripHtml(field(vendor, "description", "about", "tagline")) || `${name} on IOPPS.ca.`),
    path: `/shop/${slug}`,
    image: field(vendor, "logoUrl", "imageUrl", "coverImage"),
  });
}

export async function generateShopJsonLd(slug: string): Promise<JsonLd | null> {
  const vendor = await findFirst(["shop_vendors"], slug);
  if (!vendor) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: field(vendor, "name", "businessName", "title") || "Indigenous Business",
    description: truncate(stripHtml(field(vendor, "description", "about", "tagline"))),
    url: `https://www.iopps.ca/shop/${encodeURIComponent(slug)}`,
    image: field(vendor, "logoUrl", "imageUrl", "coverImage") || undefined,
  };
}

export async function generateScholarshipMetadata(slug: string): Promise<Metadata> {
  const scholarship = await findFirst(["scholarships"], slug);
  if (!scholarship) return fallbackMetadata("Scholarship Opportunity", "View scholarship details on IOPPS.ca.", `/scholarships/${slug}`);
  const title = field(scholarship, "title", "name") || "Scholarship Opportunity";
  const provider = field(scholarship, "provider", "organization", "orgName");
  return buildListingMetadata({
    title: provider ? `${title} — ${provider}` : title,
    description: truncate(stripHtml(field(scholarship, "description", "eligibility")) || `${title} on IOPPS.ca.`),
    path: `/scholarships/${slug}`,
    type: "article",
  });
}

export async function generateScholarshipJsonLd(slug: string): Promise<JsonLd | null> {
  const scholarship = await findFirst(["scholarships"], slug);
  if (!scholarship) return null;
  return {
    "@context": "https://schema.org",
    "@type": "MonetaryGrant",
    name: field(scholarship, "title", "name") || "Scholarship Opportunity",
    description: truncate(stripHtml(field(scholarship, "description", "eligibility"))),
    url: `https://www.iopps.ca/scholarships/${encodeURIComponent(slug)}`,
    funder: field(scholarship, "provider", "organization", "orgName")
      ? { "@type": "Organization", name: field(scholarship, "provider", "organization", "orgName") }
      : undefined,
  };
}

export async function generateMemberMetadata(uid: string): Promise<Metadata> {
  const db = getAdminDb();
  if (!db) {
    return fallbackMetadata(
      "Member Profile",
      "View this Indigenous professional's profile, experience, and endorsements on IOPPS.",
    );
  }
  try {
    const doc = await db.collection("members").doc(uid).get();
    if (!doc.exists) {
      return fallbackMetadata(
        "Member Profile",
        "View this Indigenous professional's profile on IOPPS.",
      );
    }
    const data = doc.data() || {};
    const name = clean(data.name) || clean(data.displayName) || "IOPPS Member";
    const headline = clean(data.headline) || clean(data.title);
    const nation = clean(data.nation);
    const parts = [headline, nation].filter(Boolean).join(" · ");
    return buildListingMetadata({
      title: parts ? `${name} — ${parts}` : name,
      description: truncate(stripHtml(clean(data.bio)) || `${name} on IOPPS — Canada's Indigenous professional platform.`),
      path: `/members/${uid}`,
      type: "article",
    });
  } catch {
    return fallbackMetadata(
      "Member Profile",
      "View this Indigenous professional's profile on IOPPS.",
    );
  }
}
