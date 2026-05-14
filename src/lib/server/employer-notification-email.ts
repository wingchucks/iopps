import type { DocumentData, Firestore } from "firebase-admin/firestore";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmployerNotificationEmailResolution = {
  email: string;
  source: "employers.contactEmail" | "employers.email" | "organizations.contactEmail" | "organizations.email" | "";
  checkedIds: string[];
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validEmail(value: unknown): string {
  const email = normalizeString(value);
  return EMAIL_PATTERN.test(email) ? email : "";
}

function candidateIds(input: { employerId?: unknown; orgId?: unknown; organizationId?: unknown; companyId?: unknown }): string[] {
  return Array.from(new Set([
    normalizeString(input.employerId),
    normalizeString(input.orgId),
    normalizeString(input.organizationId),
    normalizeString(input.companyId),
  ].filter(Boolean)));
}

function emailFromData(
  data: DocumentData | undefined,
  contactSource: EmployerNotificationEmailResolution["source"],
  emailSource: EmployerNotificationEmailResolution["source"],
): Pick<EmployerNotificationEmailResolution, "email" | "source"> | null {
  if (!data) return null;
  const contactEmail = validEmail(data.contactEmail);
  if (contactEmail) return { email: contactEmail, source: contactSource };

  const email = validEmail(data.email);
  if (email) return { email, source: emailSource };

  return null;
}

export async function resolveEmployerNotificationEmail(
  db: Firestore,
  input: { employerId?: unknown; orgId?: unknown; organizationId?: unknown; companyId?: unknown },
): Promise<EmployerNotificationEmailResolution> {
  const checkedIds = candidateIds(input);

  for (const id of checkedIds) {
    const snap = await db.collection("employers").doc(id).get();
    const found = emailFromData(snap.data(), "employers.contactEmail", "employers.email");
    if (found) return { ...found, checkedIds };
  }

  for (const id of checkedIds) {
    const snap = await db.collection("organizations").doc(id).get();
    const found = emailFromData(snap.data(), "organizations.contactEmail", "organizations.email");
    if (found) return { ...found, checkedIds };
  }

  return { email: "", source: "", checkedIds };
}

export async function activeJobHasNotificationEmail(
  db: Firestore,
  input: { employerId?: unknown; orgId?: unknown; organizationId?: unknown; companyId?: unknown },
): Promise<boolean> {
  const result = await resolveEmployerNotificationEmail(db, input);
  return Boolean(result.email);
}
