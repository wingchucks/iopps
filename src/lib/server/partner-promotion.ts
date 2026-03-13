import { applyNormalizedSubscriptionState, type NormalizedPlanTier } from "@/lib/server/subscription-state";
import { deriveOwnerType, type JsonRecord, type PublicOwnerType } from "@/lib/server/public-ownership";

export type PartnerTier = Exclude<NormalizedPlanTier, "free">;
export type PartnerSection = "premium" | "education" | "visibility" | null;

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

function partnerTierFromRecord(record: JsonRecord): PartnerTier | null {
  const normalized = applyNormalizedSubscriptionState(record);
  const tier = normalized.subscriptionTier ?? normalized.plan ?? normalized.tier;

  if (tier === "standard" || tier === "premium" || tier === "school") {
    return tier;
  }

  return null;
}

export function withPartnerPromotion(record: JsonRecord): JsonRecord {
  const normalized = applyNormalizedSubscriptionState(record);
  const ownerType = (normalized.ownerType as PublicOwnerType | undefined) ?? deriveOwnerType(normalized);
  const partnerTier = partnerTierFromRecord(normalized);
  const isPartner = Boolean(partnerTier);
  const config = partnerTier ? partnerTierConfig[partnerTier] : null;

  return {
    ...normalized,
    ownerType,
    isPartner,
    partnerTier: partnerTier ?? undefined,
    partnerLabel: config?.label,
    partnerBadgeLabel: config?.badgeLabel,
    partnerSection: config?.section,
    promotionWeight: config?.weight ?? 0,
  };
}

export function isPaidPartner(record: JsonRecord): boolean {
  return Boolean(withPartnerPromotion(record).isPartner);
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

