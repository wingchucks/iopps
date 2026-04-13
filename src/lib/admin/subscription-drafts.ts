import { SUBSCRIPTION_PLANS, normalizePaidTier, type SubscriptionTier } from "@/lib/pricing";

type UnknownRecord = Record<string, unknown>;

export interface AdminSubscriptionDraft {
  subscriptionTier: SubscriptionTier;
  subscriptionStart: string;
  subscriptionEnd: string;
  amount: string;
  gstAmount: string;
  totalAmount: string;
  createSubscriptionRecord: boolean;
}

interface DraftSource {
  accountType?: unknown;
  subscriptionTier?: unknown;
  plan?: unknown;
  subscriptionStart?: unknown;
  billingStartAt?: unknown;
  subscriptionEnd?: unknown;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatCurrencyInput(value: number): string {
  return roundCurrency(value).toFixed(2);
}

function formatDateInput(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addOneYear(value: Date): Date {
  return new Date(Date.UTC(
    value.getUTCFullYear() + 1,
    value.getUTCMonth(),
    value.getUTCDate(),
  ));
}

function parseDateInput(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && value !== null && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const next = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(next.getTime()) ? null : next;
  }
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPlanForTier(tier: SubscriptionTier) {
  return Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.tier === tier) ?? SUBSCRIPTION_PLANS.tier2;
}

function getDefaultTier(source: DraftSource): SubscriptionTier {
  const currentTier = normalizePaidTier(source.subscriptionTier ?? source.plan);
  if (currentTier) return currentTier;

  return text(source.accountType).toLowerCase() === "school" ? "school" : "premium";
}

export function recalculateAdminSubscriptionTotals(
  amountInput: string,
  gstInput: string,
): Pick<AdminSubscriptionDraft, "amount" | "gstAmount" | "totalAmount"> {
  const amount = Number(amountInput || 0);
  const gstAmount = Number(gstInput || 0);

  return {
    amount: formatCurrencyInput(Number.isFinite(amount) ? amount : 0),
    gstAmount: formatCurrencyInput(Number.isFinite(gstAmount) ? gstAmount : 0),
    totalAmount: formatCurrencyInput(
      (Number.isFinite(amount) ? amount : 0) + (Number.isFinite(gstAmount) ? gstAmount : 0),
    ),
  };
}

export function applyAdminSubscriptionTier(
  draft: AdminSubscriptionDraft,
  tier: SubscriptionTier,
): AdminSubscriptionDraft {
  const plan = getPlanForTier(tier);
  const amount = plan.amount;
  const gstAmount = roundCurrency(amount * 0.05);

  return {
    ...draft,
    subscriptionTier: tier,
    ...recalculateAdminSubscriptionTotals(String(amount), String(gstAmount)),
  };
}

export function buildAdminSubscriptionDraft(
  source: DraftSource | UnknownRecord,
  now = new Date(),
): AdminSubscriptionDraft {
  const tier = getDefaultTier(source);
  const plan = getPlanForTier(tier);
  const startDate =
    parseDateInput(source.subscriptionStart ?? source.billingStartAt) ?? now;
  const endDate =
    parseDateInput(source.subscriptionEnd) ??
    addOneYear(startDate);
  const gstAmount = roundCurrency(plan.amount * 0.05);

  return {
    subscriptionTier: tier,
    subscriptionStart: formatDateInput(startDate),
    subscriptionEnd: formatDateInput(endDate),
    createSubscriptionRecord: true,
    ...recalculateAdminSubscriptionTotals(String(plan.amount), String(gstAmount)),
  };
}
