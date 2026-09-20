import { hkdfSync } from "node:crypto";
import { deriveHermesAdminReviewSecret } from "./hermes-admin-request";
import { AssignmentError } from "./organization-admin-assignment";

type SecretEnvironment = Record<string, string | undefined>;

/** Preserve configured keys; otherwise derive an independent key from Admin credentials. */
export function getOrganizationAdminReviewSecret(env: SecretEnvironment = process.env): string {
  const explicit = env.ORGANIZATION_ADMIN_REVIEW_SECRET;
  if (explicit) {
    if (Buffer.byteLength(explicit, "utf8") < 32) throw new AssignmentError("Organization administrator review is not configured", 503);
    return explicit;
  }
  try {
    // Reuse the existing private-key decoding/normalization contract, excluding
    // the optional Hermes key, then separate this workflow's signing material.
    const material = deriveHermesAdminReviewSecret({
      FIREBASE_PRIVATE_KEY: env.FIREBASE_PRIVATE_KEY,
      FIREBASE_SERVICE_ACCOUNT_BASE64: env.FIREBASE_SERVICE_ACCOUNT_BASE64,
    });
    return Buffer.from(hkdfSync(
      "sha256",
      Buffer.from(material, "base64url"),
      "iopps-organization-admin-assignment-hkdf-v1",
      "iopps-organization-admin-assignment/review-token/v1",
      32,
    )).toString("base64url");
  } catch {
    throw new AssignmentError("Organization administrator review is not configured", 503);
  }
}
