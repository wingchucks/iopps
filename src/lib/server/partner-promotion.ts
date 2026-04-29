import { hasOrganizationVisibilityBlock, isOrganizationPubliclyVisible } from "@/lib/organization-profile";
import {
  applyNormalizedSubscriptionState,
  buildSubscriptionState,
  normalizeSubscriptionStatus,
  type NormalizedSubscriptionStatus,
  type NormalizedPlanTier,
} from "@/lib/server/subscription-state";
import { isComplimentarySubscription } from "@/lib/server/partner-subscription";
import { deriveOwnerType, type JsonRecord, type PublicOwnerType } from "@/lib/server/public-ownership";
import { isSchoolOrganization, isSchoolPubliclyVisible } from "@/lib/school-visibility";
import { getLegacyPublicPartnerTier, isLegacyPublicPartner } from "@/lib/legacy-partners";

export type PartnerTier = Exclude<NormalizedPlanTier, "free">;
export type PartnerSection = "premium" | "education" | "visibility" | null;
export type PartnerEligibilityReason =
  | "active_paid_subscription"
  | "legacy_directory_partner"
  | "trial_only"
  | "admin_grant"
  | "expired"
  | "not_public"
  | "no_paid_subscription";
export interface PartnerDirectorySettings {
  enabled: boolean;
  visibleAt?: string;
  sectionOverride?: Exclude<PartnerSection, null>;
  spotlight?: boolean;
}
export interface PartnerEligibility {
  isEligible: boolean;
  reason: PartnerEligibilityReason;
  tier: PartnerTier | null;
  subscriptionStatus: NormalizedSubscriptionStatus;
  subscriptionEnd?: string;
}

const partnerTierConfig: Record<PartnerTier, { label: string; badgeLabel: string; weight: number; section: Exclude<PartnerSection, null> }> = {
  standard: {
    label: "Visibility Partner",
    badgeLabel: "Partner",
    weight: 120,
    section: "visibility",
  },
  premium: {
    label: "Premium Partner",
    badgeLabel: "Premium Partner",
    weight: 320,
    section: "premium",
  },
  school: {
    label: "Education Partner",
    badgeLabel: "Education Partner",
    weight: 220,
    section: "education",
  },
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function iso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
  }
  if (typeof value === "object" && value !== null && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

function normalizePartnerSection(value: unknown): Exclude<PartnerSection, null> | undefined {
  const candidate = text(value).toLowerCase();
  if (candidate === "premium" || candidate === "education" || candidate === "visibility") {
    return candidate;
  }
  return undefined;
}

function isPubliclyListable(record: JsonRecord): boolean {
  const school = isSchoolOrganization(record);
  if (school && !isSchoolPubliclyVisible(record)) return false;
  return isOrganizationPubliclyVisible(record);
}

function hasPublicApproval(record: JsonRecord): boolean {
  const status = text(record.status).toLowerCase();
  return (
    record.onboardingComplete === true ||
    record.verified === true ||
    status === "approved" ||
    record.emailVerified === true
  );
}

function isLegacyDirectoryPartner(record: JsonRecord, tier: PartnerTier, subscriptionStatus: NormalizedSubscriptionStatus): boolean {
  const directory = getPartnerDirectorySettings(record);

  if (tier !== "premium") return false;
  if (subscriptionStatus !== "none") return false;
  if (!directory.enabled && !isLegacyPublicPartner(record)) return false;
  if (hasOrganizationVisibilityBlock(record)) return false;

  return hasPublicApproval(record);
}

export function getPartnerDirectorySettings(record: JsonRecord): PartnerDirectorySettings {
  const normalized = applyNormalizedSubscriptionState(record);
  const partnerDirectory =
    normalized.partnerDirectory && typeof normalized.partnerDirectory === "object"
      ? (normalized.partnerDirectory as JsonRecord)
      : {};

  return {
    enabled: partnerDirectory.enabled === true,
    ...(iso(partnerDirectory.visibleAt) ? { visibleAt: iso(partnerDirectory.visibleAt) } : {}),
    ...(normalizePartnerSection(partnerDirectory.sectionOverride)
      ? { sectionOverride: normalizePartnerSection(partnerDirectory.sectionOverride) }
      : {}),
    ...(typeof partnerDirectory.spotlight === "boolean" ? { spotlight: partnerDirectory.spotlight } : {}),
  };
}

function getPartnerSubscriptionEnd(record: JsonRecord): string | undefined {
  const normalized = applyNormalizedSubscriptionState(record);
  const subscription = buildSubscriptionState(normalized);

  return (
    iso(subscription.subscriptionEnd) ||
    iso((subscription as JsonRecord).expiresAt) ||
    iso(normalized.subscriptionEnd) ||
    iso((normalized.subscription as JsonRecord | undefined)?.expiresAt)
  );
}

function isExpired(endAt: string | undefined, now: Date): boolean {
  if (!endAt) return false;
  const parsed = Date.parse(endAt);
  if (Number.isNaN(parsed)) return false;
  return parsed <= now.getTime();
}

export function getPartnerSubscriptionTier(record: JsonRecord): PartnerTier | null {
  const normalized = applyNormalizedSubscriptionState(record);
  const subscription = buildSubscriptionState(normalized);
  const tier = subscription.tier;

  if (tier === "standard" || tier === "premium" || tier === "school") {
    return tier;
  }

  return getLegacyPublicPartnerTier(normalized);
}

export function hasPartnerSubscription(record: JsonRecord): boolean {
  return Boolean(getPartnerSubscriptionTier(record));
}

export function getPartnerEligibility(record: JsonRecord, now = new Date()): PartnerEligibility {
  const normalized = applyNormalizedSubscriptionState(record);
  const tier = getPartnerSubscriptionTier(normalized);
  const subscription = buildSubscriptionState(normalized);
  const subscriptionStatus = normalizeSubscriptionStatus(subscription.status);
  const subscriptionEnd = getPartnerSubscriptionEnd(normalized);

  if (!tier) {
    return {
      isEligible: false,
      reason: "no_paid_subscription",
      tier: null,
      subscriptionStatus,
      ...(subscriptionEnd ? { subscriptionEnd } : {}),
    };
  }

  if (isComplimentarySubscription(normalized)) {
    return {
      isEligible: false,
      reason: "admin_grant",
      tier,
      subscriptionStatus,
      ...(subscriptionEnd ? { subscriptionEnd } : {}),
    };
  }

  if (isExpired(subscriptionEnd, now)) {
    return {
      isEligible: false,
      reason: "expired",
      tier,
      subscriptionStatus,
      ...(subscriptionEnd ? { subscriptionEnd } : {}),
    };
  }

  if (subscriptionStatus === "trialing") {
    return {
      isEligible: false,
      reason: "trial_only",
      tier,
      subscriptionStatus,
      ...(subscriptionEnd ? { subscriptionEnd } : {}),
    };
  }

  if (isLegacyDirectoryPartner(normalized, tier, subscriptionStatus)) {
    return {
      isEligible: true,
      reason: "legacy_directory_partner",
      tier,
      subscriptionStatus,
      ...(subscriptionEnd ? { subscriptionEnd } : {}),
    };
  }

  if (subscriptionStatus !== "active") {
    return {
      isEligible: false,
      reason: "no_paid_subscription",
      tier,
      subscriptionStatus,
      ...(subscriptionEnd ? { subscriptionEnd } : {}),
    };
  }

  if (!isPubliclyListable(normalized)) {
    return {
      isEligible: false,
      reason: "not_public",
      tier,
      subscriptionStatus,
      ...(subscriptionEnd ? { subscriptionEnd } : {}),
    };
  }

  return {
    isEligible: true,
    reason: "active_paid_subscription",
    tier,
    subscriptionStatus,
    ...(subscriptionEnd ? { subscriptionEnd } : {}),
  };
}

export function getPartnerTier(record: JsonRecord): PartnerTier | null {
  const eligibility = getPartnerEligibility(record);
  return eligibility.isEligible ? eligibility.tier : null;
}

export function isPublicPartner(record: JsonRecord): boolean {
  return getPartnerEligibility(record).isEligible;
}

export function withPartnerPromotion(record: JsonRecord): JsonRecord {
  const normalized = applyNormalizedSubscriptionState(record);
  const ownerType = (normalized.ownerType as PublicOwnerType | undefined) ?? deriveOwnerType(normalized);
  const directory = getPartnerDirectorySettings(normalized);
  const eligibility = getPartnerEligibility(normalized);
  const partnerTier = eligibility.tier;
  const isPartner = eligibility.isEligible;
  const section = directory.sectionOverride ?? (partnerTier ? partnerTierConfig[partnerTier].section : undefined);
  const config = isPartner && partnerTier ? partnerTierConfig[partnerTier] : null;

  return {
    ...normalized,
    ownerType,
    isPartner,
    partnerEligibilityReason: eligibility.reason,
    partnerTier: isPartner ? partnerTier ?? undefined : undefined,
    partnerLabel: config?.label,
    partnerBadgeLabel: config?.badgeLabel,
    partnerSection: isPartner ? section : undefined,
    promotionWeight: config?.weight ?? 0,
    partnerDirectory: directory,
  };
}

export function isPaidPartner(record: JsonRecord): boolean {
  return isPublicPartner(record);
}

export function comparePartnerPromotion(left: JsonRecord, right: JsonRecord): number {
  const leftPartner = withPartnerPromotion(left);
  const rightPartner = withPartnerPromotion(right);
  const leftWeight = Number(leftPartner.promotionWeight || 0);
  const rightWeight = Number(rightPartner.promotionWeight || 0);

  if (leftWeight !== rightWeight) {
    return rightWeight - leftWeight;
  }

  const leftName = typeof leftPartner.name === "string" ? leftPartner.name : "";
  const rightName = typeof rightPartner.name === "string" ? rightPartner.name : "";
  return leftName.localeCompare(rightName);
}

