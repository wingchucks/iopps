export type SubscriptionTier = "standard" | "premium" | "school";
export type SubscriptionPlanId = "tier1" | "tier2" | "tier3";
export type OneTimePlanId = "standard-post" | "featured-post" | "program-post";
export type BillingPlanId = SubscriptionPlanId | OneTimePlanId;

export interface SubscriptionPlanDefinition {
  id: SubscriptionPlanId;
  tier: SubscriptionTier;
  title: string;
  amount: number;
  priceLabel: string;
  periodLabel: string;
  shortDescription: string;
  jobLimit: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
}

export interface PurchasePlanDefinition {
  id: OneTimePlanId;
  title: string;
  amount: number;
  priceLabel: string;
  periodLabel: string;
  shortDescription: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
}

export const SUBSCRIPTION_PLAN_IDS: SubscriptionPlanId[] = ["tier1", "tier2", "tier3"];

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlanDefinition> = {
  tier1: {
    id: "tier1",
    tier: "standard",
    title: "Standard",
    amount: 1250,
    priceLabel: "$1,250",
    periodLabel: "/year",
    shortDescription: "15 job postings, profile promotion, and basic analytics.",
    jobLimit: "15 job postings/year",
    features: [
      "15 job postings per year",
      "Business profile promotion",
      "Basic analytics",
      "Community feed access",
    ],
  },
  tier2: {
    id: "tier2",
    tier: "premium",
    title: "Premium",
    amount: 2500,
    priceLabel: "$2,500",
    periodLabel: "/year",
    shortDescription: "Unlimited jobs, featured visibility, and talent search.",
    jobLimit: "Unlimited job postings",
    badge: "Most Popular",
    highlight: true,
    features: [
      "Unlimited job postings",
      "4 featured job slots",
      "Talent search access",
      "Advanced analytics dashboard",
      "Priority support",
      "Premium Partner badge",
    ],
  },
  tier3: {
    id: "tier3",
    tier: "school",
    title: "School",
    amount: 5500,
    priceLabel: "$5,500",
    periodLabel: "/year",
    shortDescription: "Programs, jobs, featured listings, and school tools.",
    jobLimit: "Unlimited jobs + programs",
    features: [
      "20 program listings",
      "Unlimited job postings",
      "6 featured listings",
      "Student inquiry inbox",
      "Education Partner badge",
      "Custom branding",
    ],
  },
};

export const ONE_TIME_PLANS: Record<OneTimePlanId, PurchasePlanDefinition> = {
  "standard-post": {
    id: "standard-post",
    title: "Standard Job Post",
    amount: 125,
    priceLabel: "$125",
    periodLabel: "/post",
    shortDescription: "45 days, standard listing.",
    features: [
      "45-day listing",
      "Basic visibility",
      "Application tracking",
    ],
  },
  "featured-post": {
    id: "featured-post",
    title: "Featured Job Post",
    amount: 200,
    priceLabel: "$200",
    periodLabel: "/post",
    shortDescription: "45 days, featured placement at the top.",
    badge: "Best Value",
    highlight: true,
    features: [
      "45-day listing",
      "Homepage featured placement",
      "Highlighted in search",
      "Priority in feed",
    ],
  },
  "program-post": {
    id: "program-post",
    title: "Program Post",
    amount: 50,
    priceLabel: "$50",
    periodLabel: "/post",
    shortDescription: "List a training or school program.",
    features: [
      "45-day listing",
      "Program directory placement",
      "Application tracking",
    ],
  },
};

export const PLAN_TIER_LABELS: Record<SubscriptionTier, string> = {
  standard: "Standard - $1,250/yr",
  premium: "Premium - $2,500/yr",
  school: "School Tier - $5,500/yr",
};

export const PLAN_TIER_COLORS: Record<SubscriptionTier, string> = {
  standard: "bg-green-500/15 text-green-600",
  premium: "bg-blue-500/15 text-blue-500",
  school: "bg-amber-500/15 text-amber-600",
};

export const ANNUAL_PLAN_AMOUNTS: Record<SubscriptionTier, number> = {
  standard: 1250,
  premium: 2500,
  school: 5500,
};

export function isSubscriptionPlanId(value: string | null | undefined): value is SubscriptionPlanId {
  return value === "tier1" || value === "tier2" || value === "tier3";
}

export function normalizePaidTier(value: unknown): SubscriptionTier | null {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!candidate) return null;

  if (candidate === "tier1" || candidate === "standard" || candidate === "essential") {
    return "standard";
  }
  if (candidate === "tier2" || candidate === "premium" || candidate === "professional") {
    return "premium";
  }
  if (candidate === "tier3" || candidate === "school") {
    return "school";
  }

  return null;
}

export function getSubscriptionPlanByTier(value: unknown): SubscriptionPlanDefinition | null {
  const tier = normalizePaidTier(value);
  if (!tier) return null;

  return Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.tier === tier) || null;
}

export function getAnnualPlanAmount(value: unknown): number | null {
  const tier = normalizePaidTier(value);
  return tier ? ANNUAL_PLAN_AMOUNTS[tier] : null;
}

export function getPlanById(planId: string | null | undefined): SubscriptionPlanDefinition | PurchasePlanDefinition | null {
  if (!planId) return null;
  if (isSubscriptionPlanId(planId)) return SUBSCRIPTION_PLANS[planId];
  if (planId in ONE_TIME_PLANS) return ONE_TIME_PLANS[planId as OneTimePlanId];
  return null;
}
