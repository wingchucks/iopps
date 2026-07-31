import { displayAmount, normalizeExternalHref } from "@/lib/utils";

export interface TrainingListingLike {
  externalUrl?: unknown;
  sourceUrl?: unknown;
  price?: unknown;
  endDate?: unknown;
}

export function getOfficialTrainingUrl(program: TrainingListingLike): string {
  return normalizeExternalHref(program.externalUrl ?? program.sourceUrl);
}

export function isProviderHostedTraining(program: TrainingListingLike): boolean {
  return Boolean(getOfficialTrainingUrl(program));
}

export function getTrainingPriceLabel(program: TrainingListingLike): string {
  const priceLabel = displayAmount(program.price);
  if (priceLabel) return priceLabel;
  return isProviderHostedTraining(program) ? "See provider for fees" : "Free";
}

export function isCurrentTrainingListing(
  program: TrainingListingLike,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  if (typeof program.endDate !== "string") return true;
  const endDate = program.endDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return true;
  return endDate >= today;
}
