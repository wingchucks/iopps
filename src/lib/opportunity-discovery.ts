import { getEventStartDate, getEventEndDate } from "@/lib/public-events";
import { provinceCode } from "@/lib/canadian-provinces";
import { scholarshipDeadlineType } from "@/lib/opportunity-posting";
import { isJobRecordExpired } from "@/lib/listing-freshness";
export function opportunityProvince(item: Record<string, unknown>): string {
  const location = item.location && typeof item.location === "object" ? item.location as Record<string, unknown> : {};
  return provinceCode(item.province || location.province) || String(typeof item.location === "string" ? item.location : "").split(/[,\n]/).map(part => provinceCode(part)).find(Boolean) || "";
}
export function matchesEventDate(item: Record<string, unknown>, filter: string, now = new Date()): boolean {
  const start = getEventStartDate(item), end = getEventEndDate(item);
  if (filter === "unconfirmed") return !start;
  if (filter === "all") return true;
  if (!start || !end || end < now) return false;
  if (filter === "week") { const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() + 7); cutoff.setHours(23, 59, 59, 999); return start <= cutoff; }
  if (filter === "month") return start <= new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return true;
}
export function matchesFundingDeadline(item: Record<string, unknown>, filter: string, now = new Date()): boolean {
  if (filter === "all") return true;
  if (filter === "closed") return isJobRecordExpired(item, now);
  if (isJobRecordExpired(item, now)) return false;
  const type = scholarshipDeadlineType(item);
  if (filter === "rolling" || filter === "unknown") return type === filter;
  if (filter === "closing") {
    if (type !== "date") return false;
    const deadline = new Date(String(item.deadline).slice(0, 10) + "T23:59:59");
    return Number.isFinite(deadline.getTime()) && deadline.getTime() >= now.getTime() && deadline.getTime() - now.getTime() <= 14 * 86400000;
  }
  return true;
}
