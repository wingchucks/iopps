export type SubscriptionTier = "standard" | "premium" | "school";

/** Shown with every employer price: amounts are Canadian dollars before GST. */
export const PRICE_TAX_NOTE = "CAD + GST";
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

// Legacy definitions remain available for receipts and webhook fulfillment.
export function isPlanAvailableForPurchase(value: unknown): value is "tier1" | "tier2" | "standard-post" | "featured-post" {
  return value === "tier1" || value === "tier2" || value === "standard-post" || value === "featured-post";
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
    shortDescription: "Job listings, featured visibility, and application management.",
    jobLimit: "Unlimited job postings",
    badge: "Most Popular",
    highlight: true,
    features: [
      "Unlimited job postings",
      "4 featured job slots",
      "Manage received applications",
      "Recorded job and application analytics",
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
    shortDescription: "30 days, standard listing.",
    features: [
      "30-day listing",
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
    shortDescription: "Choose up to 45 days, with featured placement.",
    highlight: true,
    features: [
      "Choose a listing duration up to 45 days",
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
  if (Object.hasOwn(ONE_TIME_PLANS, planId)) return ONE_TIME_PLANS[planId as OneTimePlanId];
  return null;
}

/* ── Annual terms ── */

/** IOPPS bills in Saskatchewan time: America/Regina is UTC-6 all year (no DST). */
export const BILLING_TIME_ZONE = "America/Regina";
const BILLING_UTC_OFFSET_MS = 6 * 3_600_000;
const DAY_MS = 86_400_000;

/**
 * The end of an annual term: exactly one calendar year after `start`, at the same
 * Saskatchewan wall-clock time. February 29 maps to February 28 in non-leap years.
 */
export function addOneCalendarYear(start: Date): Date {
  const local = new Date(start.getTime() - BILLING_UTC_OFFSET_MS); // UTC fields read as Regina wall clock
  const year = local.getUTCFullYear() + 1;
  const month = local.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const wallClock = Date.UTC(
    year, month, Math.min(local.getUTCDate(), lastDay),
    local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds(),
  );
  return new Date(wallClock + BILLING_UTC_OFFSET_MS);
}

/** Customer-facing billing date, always on the Saskatchewan calendar. */
export function formatBillingDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: BILLING_TIME_ZONE });
}

/** Same-tier renewals can be bought during the last 60 days of a paid annual term. */
export const ANNUAL_RENEWAL_WINDOW_DAYS = 60;

export function renewalWindowOpensAt(termEnd: Date): Date {
  return new Date(termEnd.getTime() - ANNUAL_RENEWAL_WINDOW_DAYS * DAY_MS);
}

export interface AnnualTermSummary {
  id: string;
  tier: SubscriptionTier;
  /** When access under this term began (early access for a manual future term). */
  startsAt: string;
  endsAt: string;
}

export type AnnualPurchaseBlock = "current_plan" | "plan_change" | "renewal_scheduled" | "billing_review";

export interface AnnualPurchaseOption {
  planId: SubscriptionPlanId;
  available: boolean;
  /** "new" starts a term at payment; "renewal" starts when the current paid term ends. */
  kind: "new" | "renewal" | null;
  reason: AnnualPurchaseBlock | null;
  /** Short status for a plan card, such as "Current plan · ends October 2, 2027". */
  label: string | null;
  message: string | null;
  /** Term a purchase would buy (renewals only; a new term starts at payment). */
  startsAt: string | null;
  endsAt: string | null;
}

export interface AnnualPurchaseState {
  /** The paid annual term in effect now (complimentary access is not a paid term). */
  paidTerm: AnnualTermSummary | null;
  /** A paid renewal that starts when the current term ends. */
  renewal: AnnualTermSummary | null;
  /** Paid evidence exists but could not be resolved; annual purchases wait for review. */
  reviewRequired?: boolean;
}

export const BILLING_SUPPORT_EMAIL = "hello@iopps.ca";

const PLAN_ID_BY_TIER: Record<SubscriptionTier, SubscriptionPlanId> = { standard: "tier1", premium: "tier2", school: "tier3" };

/**
 * Whether an annual plan may be bought now. A paid annual term is never replaced or
 * shortened: only a same-tier renewal in the term's last 60 days is sold, and that
 * renewal starts when the current term ends. Mid-term plan changes go through support.
 */
export function annualPurchaseOption(planId: SubscriptionPlanId, state: AnnualPurchaseState, now: Date): AnnualPurchaseOption {
  const plan = SUBSCRIPTION_PLANS[planId];
  const blocked = (reason: AnnualPurchaseBlock, label: string, message: string): AnnualPurchaseOption =>
    ({ planId, available: false, kind: null, reason, label, message, startsAt: null, endsAt: null });
  if (state.reviewRequired) {
    return blocked("billing_review", "Plan review needed",
      `Your current annual plan needs a quick review before another annual purchase. Contact ${BILLING_SUPPORT_EMAIL} and we'll sort it out.`);
  }
  const term = state.paidTerm;
  if (!term) return { planId, available: true, kind: "new", reason: null, label: null, message: null, startsAt: null, endsAt: null };
  const currentTitle = SUBSCRIPTION_PLANS[PLAN_ID_BY_TIER[term.tier]].title;
  const termEnd = new Date(term.endsAt);
  if (state.renewal) {
    const renewalTitle = SUBSCRIPTION_PLANS[PLAN_ID_BY_TIER[state.renewal.tier]].title;
    return blocked("renewal_scheduled",
      plan.tier === state.renewal.tier ? `Renewal paid · starts ${formatBillingDate(state.renewal.startsAt)}` : "Renewal already paid",
      `Your ${renewalTitle} renewal is paid and runs from ${formatBillingDate(state.renewal.startsAt)} to ${formatBillingDate(state.renewal.endsAt)}.`);
  }
  if (plan.tier !== term.tier) {
    return blocked("plan_change", "Contact us to change plans",
      `You're on the ${currentTitle} plan until ${formatBillingDate(termEnd)}. Contact us at ${BILLING_SUPPORT_EMAIL} to change plans; annual plans are not prorated.`);
  }
  const opens = renewalWindowOpensAt(termEnd);
  if (now < opens) {
    return blocked("current_plan", `Current plan · ends ${formatBillingDate(termEnd)}`,
      `Your ${currentTitle} plan runs until ${formatBillingDate(termEnd)}. Renewal opens ${formatBillingDate(opens)}, ${ANNUAL_RENEWAL_WINDOW_DAYS} days before it ends.`);
  }
  const renewalEnd = addOneCalendarYear(termEnd);
  return {
    planId, available: true, kind: "renewal", reason: null,
    label: `Current plan · ends ${formatBillingDate(termEnd)}`,
    message: `Renewing adds a full year: ${formatBillingDate(termEnd)} to ${formatBillingDate(renewalEnd)}. Your current term is not shortened.`,
    startsAt: termEnd.toISOString(), endsAt: renewalEnd.toISOString(),
  };
}

/** Annual plans currently sold, with what buying each would do now. */
export function annualPurchaseOptions(state: AnnualPurchaseState, now: Date): Record<"tier1" | "tier2", AnnualPurchaseOption> {
  return { tier1: annualPurchaseOption("tier1", state, now), tier2: annualPurchaseOption("tier2", state, now) };
}

/** Complimentary (admin or Hermes, $0) access shown truthfully: it never funds job postings. */
export interface ComplimentaryAccessSummary {
  tier: SubscriptionTier;
  endsAt: string | null;
}

/** Server-computed billing state shared by the billing page, plan picker and checkout. */
export interface BillingOverview extends AnnualPurchaseState {
  plan: "free" | SubscriptionTier;
  complimentary: ComplimentaryAccessSummary | null;
  annualPlans: Record<"tier1" | "tier2", AnnualPurchaseOption>;
  /** Only the organization owner can buy plans or credits. */
  canPurchase: boolean;
}

export const COMPLIMENTARY_ACCESS_LABEL = "Complimentary — paid postings not included";
export const COMPLIMENTARY_ACCESS_DETAIL =
  "Complimentary access is not a paid plan: it does not include job postings or featured job slots. Each job posting still needs a paid posting credit or a paid annual plan.";
