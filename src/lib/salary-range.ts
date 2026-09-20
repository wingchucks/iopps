export function salaryRangeError(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return "Enter a valid salary range.";
  const { min, max } = value as Record<string, unknown>;
  if (typeof min !== "number" || typeof max !== "number" || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0 || max > 1000000000) return "Salary amounts must be non-negative numbers.";
  return min > max ? "Minimum salary cannot exceed maximum salary." : null;
}
