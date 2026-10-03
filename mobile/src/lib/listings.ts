import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { apiRequest, ApiError } from "./api";
import { db } from "./firebase";
import { formatDateTime, toDate } from "./dates";
import type { Conference, LiveStreamEvent, PowwowEvent, Scholarship, VendorProfile } from "../types";

// Events, scholarships and live streams come from the website's public APIs, which
// list only what the website shows. Shop vendors are public shop_vendors records,
// which firestore.rules lets anyone read, as on the website (src/lib/firestore/shop.ts).

type Raw = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const firstText = (...values: unknown[]) => values.map(text).find(Boolean) ?? "";
const record = (value: unknown): Raw => (value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {});

/** The record a detail API returns under `key`, or null when it is not found (404). */
async function getDetail(path: string, key: string): Promise<Raw | null> {
  try {
    const data = await apiRequest<Raw>(path);
    return data[key] ? record(data[key]) : null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// ============ EVENTS ============

// The website's event type labels (normalizeEventTypeLabel in src/lib/public-events.ts).
const EVENT_TYPE_LABELS: Record<string, string> = {
  "career fair": "Career Fair",
  conference: "Conference",
  cultural: "Round Dance",
  powwow: "Pow Wow",
  "pow wow": "Pow Wow",
  "round dance": "Round Dance",
  sports: "Sports",
  career_fair: "Career Fair",
  round_dance: "Round Dance",
  hockey: "Hockey Tournament",
  workshop: "Workshop / Training",
  networking: "Networking",
  webinar: "Webinar",
  fundraiser: "Fundraiser",
};

export function eventTypeLabel(event: Raw): string {
  const value = firstText(event.eventType, event.category) || "Other";
  return EVENT_TYPE_LABELS[value.toLowerCase()] || value;
}

const isPowwow = (event: Raw) => eventTypeLabel(event) === "Pow Wow";
const organizerOf = (event: Raw) =>
  firstText(event.organizerName, event.organizer, event.orgName, event.organization);
const registrationOf = (event: Raw) => firstText(event.rsvpLink, event.applicationUrl, event.sourceUrl);

/** Upcoming and current events, soonest first (the API does not sort them). */
async function listEvents(): Promise<Raw[]> {
  const { events } = await apiRequest<{ events?: unknown }>("/api/events");
  const start = (event: Raw) => toDate(event.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  return (Array.isArray(events) ? events : []).map(record).sort((a, b) => start(a) - start(b));
}

function toConference(event: Raw): Conference {
  return {
    id: text(event.id),
    title: text(event.title),
    organizerName: organizerOf(event),
    description: text(event.description),
    location: text(event.location),
    startDate: text(event.startDate),
    endDate: text(event.endDate),
    dates: text(event.dates),
    registrationUrl: registrationOf(event),
    cost: text(event.price),
    format: eventTypeLabel(event),
    featured: event.featured === true,
  };
}

function toPowwow(event: Raw): PowwowEvent {
  return {
    id: text(event.id),
    name: text(event.title),
    host: organizerOf(event),
    location: text(event.location),
    startDate: text(event.startDate),
    endDate: text(event.endDate),
    dateRange: text(event.dates),
    description: text(event.description),
    registrationUrl: registrationOf(event),
  };
}

/** Conferences, career fairs and every other event that is not a pow wow. */
export async function listConferences(): Promise<Conference[]> {
  return (await listEvents()).filter((event) => !isPowwow(event)).map(toConference);
}

export async function getConference(id: string): Promise<Conference | null> {
  const event = await getDetail(`/api/events/${encodeURIComponent(id)}`, "event");
  return event ? toConference(event) : null;
}

export async function listPowwows(): Promise<PowwowEvent[]> {
  return (await listEvents()).filter(isPowwow).map(toPowwow);
}

export async function getPowwow(id: string): Promise<PowwowEvent | null> {
  const event = await getDetail(`/api/events/${encodeURIComponent(id)}`, "event");
  return event ? toPowwow(event) : null;
}

// ============ SCHOLARSHIPS ============

function toScholarship(scholarship: Raw): Scholarship {
  return {
    id: text(scholarship.id),
    slug: firstText(scholarship.slug, scholarship.id),
    title: text(scholarship.title),
    provider: firstText(scholarship.ownerName, scholarship.orgName, scholarship.listedByName, scholarship.organization),
    description: text(scholarship.description),
    amount: text(scholarship.amount),
    deadline: text(scholarship.deadline),
    level: text(scholarship.educationLevel),
    region: firstText(scholarship.location, scholarship.province),
    type: text(scholarship.category) || "Scholarship",
  };
}

/** Scholarships and other funding still taking applications, as the website lists them. */
export async function listScholarships(): Promise<Scholarship[]> {
  const { scholarships } = await apiRequest<{ scholarships?: unknown }>("/api/scholarships");
  return (Array.isArray(scholarships) ? scholarships : [])
    .map(record)
    .filter((scholarship) => scholarship.intakeClosed !== true)
    .map(toScholarship);
}

export async function getScholarship(id: string): Promise<Scholarship | null> {
  const scholarship = await getDetail(`/api/scholarships/${encodeURIComponent(id)}`, "scholarship");
  return scholarship ? toScholarship(scholarship) : null;
}

// ============ LIVE STREAMS ============

function toLiveStream(video: Raw, status: LiveStreamEvent["status"]): LiveStreamEvent {
  const id = text(video.id);
  return {
    id,
    title: text(video.title),
    host: "IOPPS",
    description: text(video.description),
    category: "",
    startTime: formatDateTime(firstText(video.actualStart, video.scheduledStart, video.publishedAt)),
    status,
    platform: "YouTube",
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
  };
}

/** The live broadcast, upcoming broadcasts and replays from the IOPPS YouTube channel. */
export async function listLiveStreams(): Promise<LiveStreamEvent[]> {
  const data = await apiRequest<{ live?: unknown; upcoming?: unknown; recent?: unknown }>("/api/livestreams/youtube");
  const videos = (value: unknown) => (Array.isArray(value) ? value.map(record) : []);
  const streams = [
    ...(data.live ? [toLiveStream(record(data.live), "Live Now")] : []),
    ...videos(data.upcoming).map((video) => toLiveStream(video, "Upcoming")),
    ...videos(data.recent).map((video) => toLiveStream(video, "Replay")),
  ];
  const seen = new Set<string>();
  return streams.filter((stream) => stream.id && !seen.has(stream.id) && seen.add(stream.id));
}

// ============ SHOP ============

function toVendor(id: string, vendor: Raw): VendorProfile {
  const location = vendor.location;
  const place = typeof location === "string"
    ? text(location)
    : [text(record(location).city), text(record(location).province)].filter(Boolean).join(", ");
  const social = record(vendor.socialLinks);
  return {
    id,
    businessName: text(vendor.name),
    category: text(vendor.category),
    location: place,
    about: text(vendor.description),
    logoUrl: text(vendor.logo),
    heroImageUrl: text(vendor.bannerImage),
    websiteUrl: text(vendor.website),
    contactEmail: text(vendor.email),
    contactPhone: text(vendor.phone),
    instagram: text(social.instagram),
    facebook: text(social.facebook),
    featured: vendor.featured === true,
  };
}

export async function listVendors(): Promise<VendorProfile[]> {
  const snapshot = await getDocs(query(collection(db, "shop_vendors"), orderBy("name", "asc")));
  return snapshot.docs.map((vendor) => toVendor(vendor.id, vendor.data()));
}

export async function getVendor(id: string): Promise<VendorProfile | null> {
  const vendor = await getDoc(doc(db, "shop_vendors", id));
  return vendor.exists() ? toVendor(vendor.id, vendor.data()) : null;
}
