import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * M-1 — Small shared metadata helpers for the detail-page layouts. Every
 * detail route currently ships a generic static title ("Job Opportunity",
 * "Event", "Organization Profile", etc.). These helpers fetch the record
 * server-side at build / request time and return a per-entity title so
 * tabs, bookmarks, and search engines see something useful.
 */

const SITE = "IOPPS";
const SITE_URL = "https://www.iopps.ca";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function truncate(input: string, max = 190): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

function stripHtml(input?: string): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

type EntityLookup = {
  collections: readonly string[];
  slugFields?: readonly string[];
};

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

export function fallbackMetadata(title: string, description: string): Metadata {
  return { title: `${title} | ${SITE}`, description };
}

export async function generateJobMetadata(slug: string): Promise<Metadata> {
  const lookup: EntityLookup = { collections: ["jobs", "posts"] };
  const job = await findFirst(lookup.collections, slug, lookup.slugFields);
  if (!job) {
    return fallbackMetadata(
      "Job Opportunity",
      "View full job details, requirements, and application instructions for this Indigenous career opportunity on IOPPS.",
    );
  }
  const title = clean(job.title) || "Job Opportunity";
  const employer = clean(job.employerName) || clean(job.orgName) || clean(job.companyName);
  const location = clean(job.location) || clean((job.location as Record<string, string> | undefined)?.city);
  const facts = [employer, location].filter(Boolean).join(" · ");
  const summary = truncate(
    facts
      ? `${title} at ${employer || "an IOPPS employer"}. ${stripHtml(clean(job.description))}`
      : `${title}. ${stripHtml(clean(job.description))}`,
  );
  return {
    title: employer ? `${title} — ${employer} | ${SITE}` : `${title} | ${SITE}`,
    description: summary || "View full job details on IOPPS.",
    alternates: { canonical: `${SITE_URL}/jobs/${slug}` },
  };
}

export async function generateEventMetadata(slug: string): Promise<Metadata> {
  const lookup: EntityLookup = { collections: ["events", "posts"] };
  const event = await findFirst(lookup.collections, slug, lookup.slugFields);
  if (!event) {
    return fallbackMetadata(
      "Event",
      "View event details, schedule, and RSVP for this Indigenous community gathering, pow wow, or career fair on IOPPS.",
    );
  }
  const title = clean(event.title) || "Event";
  const dates = clean(event.dates) || clean(event.date);
  const host = clean(event.orgName) || clean(event.organizerName);
  const leading = [dates, host].filter(Boolean).join(" · ");
  return {
    title: dates ? `${title} — ${dates} | ${SITE}` : `${title} | ${SITE}`,
    description: truncate(
      leading
        ? `${title} · ${leading}. ${stripHtml(clean(event.description))}`
        : `${title}. ${stripHtml(clean(event.description))}`,
    ) || "View event details on IOPPS.",
    alternates: { canonical: `${SITE_URL}/events/${slug}` },
  };
}

export async function generateOrgMetadata(slug: string): Promise<Metadata> {
  const lookup: EntityLookup = { collections: ["organizations", "employers"] };
  const org = await findFirst(lookup.collections, slug, lookup.slugFields);
  if (!org) {
    return fallbackMetadata(
      "Organization Profile",
      "View this organization's profile, open positions, and partnership details on IOPPS — Canada's Indigenous professional platform.",
    );
  }
  const name = clean(org.name) || "Organization";
  const tagline = clean(org.tagline);
  return {
    title: `${name} | ${SITE}`,
    description: truncate(
      tagline || stripHtml(clean(org.description)) || `${name} on IOPPS.`,
    ),
    alternates: { canonical: `${SITE_URL}/org/${slug}` },
  };
}

export async function generateSchoolMetadata(slug: string): Promise<Metadata> {
  const lookup: EntityLookup = { collections: ["organizations"] };
  const school = await findFirst(lookup.collections, slug, lookup.slugFields);
  if (!school) {
    return fallbackMetadata(
      "School Profile",
      "View this school's programs, scholarships, and career opportunities for Indigenous students on IOPPS.",
    );
  }
  const name = clean(school.name) || "School";
  return {
    title: `${name} | Schools | ${SITE}`,
    description: truncate(
      stripHtml(clean(school.description)) || `Programs, scholarships, and careers at ${name} on IOPPS.`,
    ),
    alternates: { canonical: `${SITE_URL}/schools/${slug}` },
  };
}

export async function generateProgramMetadata(slug: string): Promise<Metadata> {
  const lookup: EntityLookup = { collections: ["training", "programs", "posts"] };
  const program = await findFirst(lookup.collections, slug, lookup.slugFields);
  if (!program) {
    return fallbackMetadata(
      "Program",
      "View training program details, credentials, and enrollment information on IOPPS.",
    );
  }
  const name = clean(program.title) || clean(program.programName) || "Program";
  const provider = clean(program.institutionName) || clean(program.provider) || clean(program.orgName);
  return {
    title: provider ? `${name} — ${provider} | ${SITE}` : `${name} | ${SITE}`,
    description: truncate(
      stripHtml(clean(program.description)) || `${name} on IOPPS.`,
    ),
    alternates: { canonical: `${SITE_URL}/programs/${slug}` },
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
    return {
      title: parts ? `${name} — ${parts} | ${SITE}` : `${name} | ${SITE}`,
      description: truncate(
        stripHtml(clean(data.bio)) || `${name} on IOPPS — Canada's Indigenous professional platform.`,
      ),
      alternates: { canonical: `${SITE_URL}/members/${uid}` },
    };
  } catch {
    return fallbackMetadata(
      "Member Profile",
      "View this Indigenous professional's profile on IOPPS.",
    );
  }
}
