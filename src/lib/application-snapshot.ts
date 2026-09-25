import type { MemberProfile } from "@/lib/firestore/members";

export function createResumeObjectName(fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "resume.pdf";
  return `${crypto.randomUUID()}-${safeName}`;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** Freeze only the candidate information intentionally shared in an application. */
export function buildApplicationProfileSnapshot(profile: Partial<MemberProfile>, capturedAt: string): Partial<MemberProfile> & { capturedAt: string } {
  return {
    displayName: text(profile.displayName),
    email: text(profile.email),
    location: text(profile.location),
    headline: text(profile.headline),
    bio: text(profile.bio),
    skills: Array.isArray(profile.skills) ? profile.skills.filter((skill): skill is string => typeof skill === "string") : [],
    skillsText: text(profile.skillsText),
    // Copy only the known education fields so stored records cannot carry arbitrary nested data.
    education: (Array.isArray(profile.education) ? profile.education : [])
      .filter(item => item && typeof item === "object")
      .map(item => ({
        school: text(item.school), degree: text(item.degree), field: text(item.field),
        ...(typeof item.year === "number" && Number.isFinite(item.year) ? { year: item.year } : {}),
      })) as MemberProfile["education"],
    capturedAt,
  };
}
