import type { MemberProfile } from "@/lib/firestore/members";

export function createResumeObjectName(fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "resume.pdf";
  return `${crypto.randomUUID()}-${safeName}`;
}

/** Freeze only the candidate information intentionally shared in an application. */
export function buildApplicationProfileSnapshot(profile: Partial<MemberProfile>, capturedAt: string): Partial<MemberProfile> & { capturedAt: string } {
  return {
    displayName: profile.displayName || "",
    email: profile.email || "",
    location: profile.location || "",
    headline: profile.headline || "",
    bio: profile.bio || "",
    skills: [...(profile.skills || [])],
    skillsText: profile.skillsText || "",
    education: (profile.education || []).map(item => ({ ...item })),
    capturedAt,
  };
}
