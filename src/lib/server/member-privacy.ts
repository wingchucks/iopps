import { isUserAccessBlocked } from "@/lib/access-state";

type RecordData = Record<string, unknown>;
const publicFields = ["displayName", "photoURL", "headline", "nation", "territory", "languages", "skillsText", "skills", "interests", "community", "location", "bio", "openToWork", "targetRoles", "workPreference", "education", "joinedAt"];
const fieldDefaults: Record<string, string> = { email: "only_me", community: "everyone", location: "members", bio: "everyone", interests: "everyone" };

export function visibleMemberProfile(uid: string, member: RecordData, settings: RecordData, account: RecordData, signedIn: boolean, directory = false): RecordData | null {
  if (isUserAccessBlocked(account) || isUserAccessBlocked(member)) return null;
  const visibility = settings.profileVisibility ?? "public";
  if (visibility === "private" || (visibility === "members_only" && !signedIn)) return null;
  if (!["public", "members_only"].includes(String(visibility))) return null;
  if (directory && (settings.showInDirectory === false || member.hideFromDirectory === true)) return null;
  const configured = settings.fieldVisibility && typeof settings.fieldVisibility === "object" ? settings.fieldVisibility as RecordData : {};
  const result: RecordData = { uid };
  for (const key of [...publicFields, "email"]) {
    const fieldVisibility = configured[key] ?? fieldDefaults[key] ?? "everyone";
    if (fieldVisibility !== "everyone" && !(fieldVisibility === "members" && signedIn)) continue;
    if (member[key] !== undefined) result[key] = member[key];
  }
  return result;
}
