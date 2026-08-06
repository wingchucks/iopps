export const NEW_EMPLOYER_STATUS = "pending" as const;

export function buildEmployerEmailVerificationUpdate(updatedAt: unknown) {
  return {
    emailVerified: true,
    updatedAt,
  };
}

export function buildEmployerOnboardingCompletionUpdate(updatedAt: unknown) {
  return {
    onboardingComplete: true,
    updatedAt,
  };
}

export function isEmployerApproved(status: unknown): boolean {
  return typeof status === "string" && status.trim().toLowerCase() === "approved";
}
