import { provinceCode } from "./canadian-provinces";
import { countryNamed } from "./country-names";

export const LISTING_REVIEW_STATUSES = ["draft", "pending", "changes_requested", "approved", "rejected"] as const;
export type ListingReviewStatus = typeof LISTING_REVIEW_STATUSES[number];
export interface BusinessListingReview {
  status: ListingReviewStatus;
  revision: number;
  submittedRevision?: number;
  approvedRevision?: number;
  submittedAt?: string;
  submittedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  feedback?: string;
}

export const REVIEW_LABELS: Record<ListingReviewStatus, string> = {
  draft: "Draft", pending: "In review", changes_requested: "Changes requested", approved: "Approved", rejected: "Not approved",
};

type RecordData = Record<string, unknown>;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function newBusinessListingReview(): BusinessListingReview {
  return { status: "draft", revision: 1 };
}

/** A public listing from before directory review. Admins act on it as an approved first version. */
export const EXISTING_LISTING_REVIEW: BusinessListingReview = { status: "approved", revision: 1, submittedRevision: 1, approvedRevision: 1 };

export function getBusinessListingReview(org: { directoryReview?: unknown }): BusinessListingReview | null {
  // Existing listings retain their visibility until their next public profile edit.
  if (org.directoryReview === undefined) return null;
  const value = org.directoryReview as BusinessListingReview | null;
  if (!value || !LISTING_REVIEW_STATUSES.includes(value.status) || !Number.isSafeInteger(value.revision) || value.revision < 1) {
    return newBusinessListingReview();
  }
  return value;
}

export function businessListingReviewAllowsPublic(org: { directoryReview?: unknown }): boolean {
  const review = getBusinessListingReview(org);
  return review === null || (review.status === "approved" && review.approvedRevision === review.revision);
}

interface ListingLocation { city: string; province: string; country: string }

function listingLocation(value: unknown): ListingLocation | null {
  if (typeof value === "string") {
    const parts = value.split(",").map(text).filter(Boolean);
    const index = parts.findIndex(part => provinceCode(part));
    if (index < 0) return parts.length ? { city: parts[0], province: parts.slice(1).join(", "), country: "" } : null;
    return { city: parts.slice(0, index).join(", "), province: parts[index], country: parts.slice(index + 1).join(", ") };
  }
  if (!value || typeof value !== "object") return null;
  const record = value as RecordData;
  return { city: text(record.city), province: text(record.province), country: text(record.country) };
}

// Letters in any script plus the marks Indigenous place names use, such as Kahnawà:ke or Skwxwú7mesh.
const PLACE_TEXT = /^[\p{L}\p{M}\p{N}\s.,:'’#&()/-]+$/u;
const WEB_ADDRESS = /:\/\/|www\.|\S\.(?:com|ca|org|net|info|biz|io|co)(?:\/|$)/i;

/** Directory listings are for businesses based in Canada: a province or territory and a real place name. */
export function businessLocationIssue(value: unknown): string | null {
  const location = listingLocation(value);
  if (!location || (!location.city && !location.province)) return "Add your city and a Canadian province or territory.";
  if (location.country && !/^(?:canada|ca|can)$/i.test(location.country.replace(/\./g, ""))) return "Directory listings are for businesses based in Canada. Choose a Canadian province or territory.";
  if (!provinceCode(location.province)) return "Choose a Canadian province or territory.";
  const city = location.city;
  if (!city) return "Add the city, town or community where you're based.";
  if (city.length < 2 || city.length > 80 || !/\p{L}/u.test(city) || !PLACE_TEXT.test(city) || WEB_ADDRESS.test(city)) return "Enter the name of your Canadian city, town or community.";
  if (provinceCode(city) || /^canada$/i.test(city)) return "Enter your city, town or community, not only the province, territory or country.";
  return null;
}

/**
 * A location for a person to check, such as a city that spells out a country ("uae").
 * Advisory only: several Canadian communities share a country's name.
 */
export function businessLocationWarning(value: unknown): string | null {
  const location = listingLocation(value);
  const country = location?.city ? location.city.split(/[,/]/).map(text).map(countryNamed).find(Boolean) : null;
  return country ? `The city "${location!.city}" matches a country name (${country}). Confirm this business is based in Canada.` : null;
}

export function businessListingIssues(org: RecordData): string[] {
  const issues: string[] = [];
  if (!text(org.name)) issues.push("Add a business or organization name.");
  if (!text(org.logoUrl) && !text(org.logo)) issues.push("Upload a logo.");
  if (!text(org.description) && !text(org.tagline)) issues.push("Add a description of your work.");
  const locationIssue = businessLocationIssue(org.location);
  if (locationIssue) issues.push(locationIssue);
  if (!text(org.contactEmail) && !text(org.phone) && !text(org.website)) issues.push("Add a public email, phone number or website.");
  if (text(org.contactEmail) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(org.contactEmail))) issues.push("Check your public email address.");
  const urls = [org.website, org.logoUrl || org.logo, org.bannerUrl, ...Object.values((org.socialLinks as RecordData) || {}),
    ...(Array.isArray(org.gallery) ? org.gallery : []), ...(Array.isArray(org.videos) ? org.videos : [])];
  if (urls.some(value => {
    if (!text(value)) return false;
    try { return !["http:", "https:"].includes(new URL(text(value)).protocol); } catch { return true; }
  })) issues.push("Use complete https:// or http:// links for websites, social profiles and images.");
  return issues;
}

function stable(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) return value.length ? JSON.stringify(value.map(stable)) : "";
  if (typeof value === "object") return JSON.stringify(Object.entries(value as RecordData).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, stable(entry)]));
  return JSON.stringify(value);
}

export function reviewAfterProfileEdit(org: RecordData, updates: RecordData): BusinessListingReview | null {
  // Only actual public content edits invalidate approval; a no-op save or private
  // template change must not take an approved listing out of the directory.
  const ignored = new Set(["updatedAt", "onboardingComplete", "isPublished", "emailTemplates", "contactName"]);
  const changed = Object.keys(updates).some(key => !ignored.has(key) && stable(org[key]) !== stable(updates[key]));
  const current = getBusinessListingReview(org);
  if (!changed) return current;
  return { ...current, status: "draft", revision: (current?.revision ?? 0) + 1, approvedRevision: 0 };
}
