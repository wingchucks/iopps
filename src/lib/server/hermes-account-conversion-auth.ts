export interface HermesAccountConversionAuthPort {
  getUser: (userId: string) => Promise<{ customClaims?: Record<string, unknown> }>;
  setCustomUserClaims: (userId: string, claims: Record<string, unknown> | null) => Promise<void>;
  revokeRefreshTokens: (userId: string) => Promise<void>;
}

const CONVERSION_CLAIMS = ["role", "employer", "employerId", "orgId"] as const;

export async function cleanupHermesAccountConversionAuthClaims(
  auth: HermesAccountConversionAuthPort,
  userId: string,
): Promise<void> {
  const user = await auth.getUser(userId);
  const nextClaims: Record<string, unknown> = { ...(user.customClaims ?? {}) };
  for (const claim of CONVERSION_CLAIMS) delete nextClaims[claim];

  await auth.setCustomUserClaims(userId, Object.keys(nextClaims).length > 0 ? nextClaims : null);
  await auth.revokeRefreshTokens(userId);

  const verified = await auth.getUser(userId);
  const verifiedClaims = verified.customClaims ?? {};
  if (CONVERSION_CLAIMS.some((claim) => Object.prototype.hasOwnProperty.call(verifiedClaims, claim))) {
    throw new Error("Firebase Auth claim cleanup verification failed");
  }
  for (const [claim, value] of Object.entries(nextClaims)) {
    if (!isDeepStrictEqual(verifiedClaims[claim], value)) {
      throw new Error("Firebase Auth claim cleanup verification failed");
    }
  }
}
import { isDeepStrictEqual } from "node:util";
