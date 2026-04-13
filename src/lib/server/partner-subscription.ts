export type JsonRecord = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getSubscriptionRecord(record: JsonRecord): JsonRecord {
  return record.subscription && typeof record.subscription === "object"
    ? (record.subscription as JsonRecord)
    : {};
}

function getKnownAmounts(record: JsonRecord): number[] {
  const subscription = getSubscriptionRecord(record);

  return [
    subscription.amountPaid,
    record.amountPaid,
    subscription.amount,
    record.amount,
    subscription.totalAmount,
    record.totalAmount,
  ]
    .map(numberValue)
    .filter((value): value is number => value !== null);
}

export function isAdminGrantSubscription(record: JsonRecord): boolean {
  const subscription = getSubscriptionRecord(record);
  const paymentId = text(subscription.paymentId ?? record.paymentId);
  const amountPaid = numberValue(subscription.amountPaid ?? record.amountPaid) ?? 0;

  return paymentId.startsWith("admin-grant") && amountPaid <= 0;
}

export function isComplimentarySubscription(record: JsonRecord): boolean {
  if (isAdminGrantSubscription(record)) return true;

  const subscription = getSubscriptionRecord(record);
  const paymentId = text(subscription.paymentId ?? record.paymentId).toLowerCase();
  const bonusReason = text(
    subscription.bonusAccessReason ??
      record.bonusAccessReason ??
      subscription.complimentaryAccessReason ??
      record.complimentaryAccessReason,
  ).toLowerCase();
  const amounts = getKnownAmounts(record);
  const hasKnownZeroDollarAmount = amounts.length > 0 && amounts.every((value) => value <= 0);

  if (!hasKnownZeroDollarAmount) return false;

  return (
    !paymentId ||
    paymentId.startsWith("admin-") ||
    paymentId.startsWith("complimentary") ||
    bonusReason.includes("complimentary") ||
    bonusReason.includes("bonus")
  );
}
