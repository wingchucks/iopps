import { provinceCode } from "./canadian-provinces";

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

export function businessListingIssues(org: RecordData): string[] {
  const issues: string[] = [];
  if (!text(org.name)) issues.push("Add a business or organization name.");
  if (!text(org.logoUrl) && !text(org.logo)) issues.push("Upload a logo.");
  if (!text(org.description) && !text(org.tagline)) issues.push("Add a description of your work.");
  const location = org.location as RecordData | undefined;
  if (!location || !text(location.city) || !provinceCode(location.province)) issues.push("Add your city and a Canadian province or territory.");
  // Only the opt-in public email counts; the private account email is never shown.
  if (!text(org.publicContactEmail) && !text(org.phone) && !text(org.website)) issues.push("Add a public email, phone number or website.");
  if (text(org.publicContactEmail) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(org.publicContactEmail))) issues.push("Check your public email address.");
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
