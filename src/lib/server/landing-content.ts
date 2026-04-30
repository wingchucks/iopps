import { getAdminDb } from "@/lib/firebase-admin";
import { buildPublicJobRouteSlugMap, isPublicJobVisible, sortJobsByRecency } from "@/lib/public-jobs";
import {
  getEventDisplayDates,
  getEventStartDate,
  isPublicEventVisible,
  normalizeEventTypeLabel,
  normalizePublicEvent,
} from "@/lib/public-events";
import { getPublicSchoolRecords } from "@/lib/server/public-schools";
import { comparePartnerPromotion, isPaidPartner, withPartnerPromotion } from "@/lib/server/partner-promotion";
import { displayAmount, displayLocation } from "@/lib/utils";

type JsonRecord = Record<string, unknown>;

export interface LandingStats {
  members: number;
  jobs: number;
  organizations: number;
  events: number;
  schools: number;
  partners: number;
}

export interface LandingPartner {
  id: string;
  name: string;
  shortName: string;
  tier: string;
  label: string;
  location: string;
  focus: string;
  href: string;
  logoUrl?: string;
}

export interface LandingJob {
  id: string;
  title: string;
  employer: string;
  location: string;
  type: string;
  salary: string;
  href: string;
  badge?: string;
  featured?: boolean;
}

export interface LandingEvent {
  id: string;
  title: string;
  host: string;
  location: string;
  date: string;
  kind: string;
  href: string;
}

export interface LandingContent {
  stats: LandingStats;
  partners: LandingPartner[];
  jobs: LandingJob[];
  events: LandingEvent[];
}

const EMPTY_STATS: LandingStats = {
  members: 0,
  jobs: 0,
  organizations: 0,
  events: 0,
  schools: 0,
  partners: 0,
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "object" && value !== null && typeof (value as JsonRecord).toDate === "function") {
    return ((value as { toDate: () => Date }).toDate()).toISOString();
  }

  if (Array.isArray(value)) return value.map(serialize);

  if (typeof value === "object") {
    const result: JsonRecord = {};
    for (const [key, entry] of Object.entries(value as JsonRecord)) {
      result[key] = serialize(entry);
    }
    return result;
  }

  return value;
}

function normalizeJobDocument(doc: FirebaseFirestore.QueryDocumentSnapshot, source: "jobs" | "posts"): JsonRecord {
  const data = serialize({ id: doc.id, ...doc.data() }) as JsonRecord;
  data._source = source;
  if (!text(data.employerName)) {
    data.employerName = data.orgName || data.companyName || data.orgShort || "";
  }
  return data;
}

function getJobType(job: JsonRecord): string {
  return text(job.employmentType) || text(job.jobType) || text(job.workLocation) || "Opportunity";
}

function getJobSalary(job: JsonRecord): string {
  return displayAmount(job.salary || job.salaryRange) || "Details listed";
}

function getClosingSoonLabel(job: JsonRecord): string | undefined {
  const raw = text(job.closingDate) || text(job.deadline);
  if (!raw) return undefined;

  const deadline = new Date(raw);
  if (Number.isNaN(deadline.getTime())) return undefined;

  const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
  return daysLeft > 0 && daysLeft <= 7 ? "Closing soon" : undefined;
}

async function getStats(): Promise<LandingStats> {
  try {
    const db = getAdminDb();
    const [usersSnap, jobsSnap, employersSnap, eventsSnap, schools] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("jobs").where("active", "==", true).count().get(),
      db.collection("employers").where("status", "==", "approved").count().get(),
      db.collection("events").count().get(),
      getPublicSchoolRecords(db),
    ]);

    return {
      members: usersSnap.data().count,
      jobs: jobsSnap.data().count,
      organizations: employersSnap.data().count,
      events: eventsSnap.data().count,
      schools: schools.length,
      partners: 0,
    };
  } catch {
    return EMPTY_STATS;
  }
}

async function getPartners(): Promise<LandingPartner[]> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("organizations").get();

    return snap.docs
      .map((doc) => withPartnerPromotion({ id: doc.id, ...doc.data() } as JsonRecord))
      .filter((org) => isPaidPartner(org))
      .sort(comparePartnerPromotion)
      .slice(0, 4)
      .map((org) => {
        const name = text(org.name) || text(org.orgName) || "IOPPS Partner";
        const shortName = text(org.shortName) || name;
        return {
          id: text(org.id) || shortName,
          name,
          shortName,
          tier: text(org.partnerTier) || "standard",
          label: text(org.partnerBadgeLabel) || text(org.partnerLabel) || "Partner",
          location: displayLocation(org.location) || "Canada",
          focus:
            text(org.description) ||
            text(org.summary) ||
            "Creating opportunities, events, hiring visibility, and community connection through IOPPS.",
          href: text(org.slug) ? `/org/${text(org.slug)}` : "/partners",
          logoUrl: text(org.logoUrl) || text(org.logo) || undefined,
        };
      });
  } catch {
    return [];
  }
}

async function getLatestJobs(): Promise<LandingJob[]> {
  try {
    const db = getAdminDb();
    const [jobsSnap, postsSnap] = await Promise.all([
      db.collection("jobs").where("active", "==", true).get(),
      db.collection("posts").where("type", "==", "job").where("status", "==", "active").get(),
    ]);

    const seen = new Set<string>();
    const jobs: JsonRecord[] = [];

    jobsSnap.docs.forEach((doc) => {
      seen.add(doc.id);
      jobs.push(normalizeJobDocument(doc, "jobs"));
    });

    postsSnap.docs.forEach((doc) => {
      const slug = text(doc.data().slug) || doc.id;
      if (!seen.has(doc.id) && !seen.has(slug)) {
        jobs.push(normalizeJobDocument(doc, "posts"));
      }
    });

    const publicJobs = jobs.filter((job) =>
      isPublicJobVisible({
        active: typeof job.active === "boolean" ? job.active : undefined,
        status: text(job.status) || undefined,
      }),
    );

    const slugMap = buildPublicJobRouteSlugMap(
      publicJobs.map((job) => ({
        id: text(job.id),
        slug: text(job.slug) || undefined,
        title: text(job.title) || undefined,
      })),
    );

    return sortJobsByRecency(publicJobs)
      .slice(0, 3)
      .map((job, index) => {
        const id = text(job.id);
        const slug = slugMap.get(id) || text(job.slug) || id;
        return {
          id,
          title: text(job.title) || "Current opportunity",
          employer: text(job.employerName) || text(job.orgName) || text(job.companyName) || "Hiring partner",
          location: displayLocation(job.location) || text(job.workLocation) || "Location listed",
          type: getJobType(job),
          salary: getJobSalary(job),
          href: `/jobs/${slug}`,
          badge: getClosingSoonLabel(job),
          featured: index < 2,
        };
      });
  } catch {
    return [];
  }
}

async function getUpcomingEvents(): Promise<LandingEvent[]> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("events").get();

    const events = snap.docs
      .map((doc) => serialize({ id: doc.id, ...doc.data() }) as JsonRecord)
      .filter((event) => isPublicEventVisible(event))
      .map((event) => normalizePublicEvent(event))
      .sort((left, right) => {
        const leftDate = getEventStartDate(left)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightDate = getEventStartDate(right)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate;
      });

    return events.slice(0, 3).map((event) => {
      const id = text(event.id);
      const slug = text(event.slug) || id;
      return {
        id,
        title: text(event.title) || "Upcoming event",
        host: text(event.orgName) || text(event.host) || "IOPPS Community",
        location: displayLocation(event.location) || "Location listed",
        date: getEventDisplayDates(event) || "Date listed soon",
        kind: normalizeEventTypeLabel(text(event.eventType)) || "Event",
        href: `/events/${slug}`,
      };
    });
  } catch {
    return [];
  }
}

export async function getLandingContent(): Promise<LandingContent> {
  const [stats, partners, jobs, events] = await Promise.all([
    getStats(),
    getPartners(),
    getLatestJobs(),
    getUpcomingEvents(),
  ]);

  return {
    stats: {
      ...stats,
      partners: partners.length,
    },
    partners,
    jobs,
    events,
  };
}
