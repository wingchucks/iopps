export interface FeaturedJobSummary {
  plan: string;
  featuredSlotsTotal: number;
  featuredSlotsUsed: number;
  featuredSlotsRemaining: number;
  featuredPostCredits: number;
  canFeatureJobs: boolean;
  isOverQuotaLegacy: boolean;
}

interface BuildFeaturedSummaryParams {
  plan?: string | null;
  subscriptionTier?: string | null;
  featuredJobsUsed: number;
  featuredPostCredits?: number | null;
}

interface EvaluateFeaturedActivationParams {
  requestedActiveFeatured: boolean;
  existingActiveFeatured: boolean;
  existingFeaturedCreditConsumed: boolean;
  activeFeaturedCountExcludingCurrent: number;
  summary: FeaturedJobSummary;
}

export interface FeaturedActivationDecision {
  allowed: boolean;
  consumeCredit: boolean;
  reason?: string;
}

export function normalizeEmployerPlan(plan?: string | null, subscriptionTier?: string | null): string {
  const value = `${subscriptionTier || plan || "free"}`.toLowerCase();
  if (value === "premium" || value === "school" || value === "standard") {
    return value;
  }
  return "free";
}

export function getIncludedFeaturedJobSlots(plan?: string | null, subscriptionTier?: string | null): number {
  const normalized = normalizeEmployerPlan(plan, subscriptionTier);
  if (normalized === "premium") return 4;
  if (normalized === "school") return 6;
  return 0;
}

export function buildFeaturedJobSummary({
  plan,
  subscriptionTier,
  featuredJobsUsed,
  featuredPostCredits,
}: BuildFeaturedSummaryParams): FeaturedJobSummary {
  const normalizedPlan = normalizeEmployerPlan(plan, subscriptionTier);
  const slots = getIncludedFeaturedJobSlots(plan, subscriptionTier);
  const credits = Math.max(0, Number(featuredPostCredits ?? 0) || 0);
  const used = Math.max(0, featuredJobsUsed);
  const totalCapacity = slots + credits;

  return {
    plan: normalizedPlan,
    featuredSlotsTotal: slots,
    featuredSlotsUsed: used,
    featuredSlotsRemaining: Math.max(slots - used, 0),
    featuredPostCredits: credits,
    canFeatureJobs: used < totalCapacity,
    isOverQuotaLegacy: used > totalCapacity,
  };
}

function getFeaturedRejectionReason(summary: FeaturedJobSummary): string {
  if (summary.plan === "premium" || summary.plan === "school") {
    return "All featured slots are currently in use. Unfeature an active job or buy a featured post credit to add another.";
  }

  return "Featured jobs require a Premium or School plan, or an available featured post credit.";
}

export function evaluateFeaturedActivation({
  requestedActiveFeatured,
  existingActiveFeatured,
  existingFeaturedCreditConsumed,
  activeFeaturedCountExcludingCurrent,
  summary,
}: EvaluateFeaturedActivationParams): FeaturedActivationDecision {
  if (!requestedActiveFeatured) {
    return { allowed: true, consumeCredit: false };
  }

  if (existingActiveFeatured || existingFeaturedCreditConsumed) {
    return { allowed: true, consumeCredit: false };
  }

  if (activeFeaturedCountExcludingCurrent < summary.featuredSlotsTotal) {
    return { allowed: true, consumeCredit: false };
  }

  if (summary.featuredPostCredits > 0) {
    return { allowed: true, consumeCredit: true };
  }

  return {
    allowed: false,
    consumeCredit: false,
    reason: getFeaturedRejectionReason(summary),
  };
}
