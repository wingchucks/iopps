import type { EmployerProfile } from "@/lib/types";

/**
 * Profile Completeness Validation
 *
 * Single source of truth for determining if an employer profile is complete
 * and whether they can create postings. Used by:
 * - UI components (ProfileCompletenessScore, OnboardingChecklist)
 * - API routes (publish, posting creation)
 * - Stripe webhook (auto-approve logic)
 */

export interface ProfileCompletenessResult {
  isComplete: boolean;
  missingFields: string[];
  score: number;
  details: {
    field: string;
    label: string;
    completed: boolean;
    currentLength?: number;
    requiredLength?: number;
  }[];
}

export interface CanPostResult {
  allowed: boolean;
  reason?: string;
  code?: "PROFILE_INCOMPLETE" | "NOT_APPROVED" | "NO_SUBSCRIPTION";
}

/**
 * Required fields for a complete profile
 * These are the minimum requirements to submit for review or be auto-approved
 */
export const REQUIRED_FIELDS = {
  logoUrl: {
    label: "Organization logo",
    minLength: 1,
    description: "Upload your organization logo"
  },
  bannerUrl: {
    label: "Banner image",
    minLength: 1,
    description: "Upload a banner/cover image"
  },
  description: {
    label: "About description",
    minLength: 100,
    description: "Write at least 100 characters about your organization"
  },
  story: {
    label: "Our Story",
    minLength: 100,
    description: "Share your organization's story (at least 100 characters)"
  },
} as const;

export type RequiredFieldKey = keyof typeof REQUIRED_FIELDS;

/**
 * Check if a single field meets its completeness requirement
 */
export function isFieldComplete(
  fieldKey: RequiredFieldKey,
  value: string | undefined | null
): boolean {
  const requirement = REQUIRED_FIELDS[fieldKey];
  if (!value) return false;
  return value.length >= requirement.minLength;
}

/**
 * Check overall profile completeness
 * Returns detailed information about which fields are complete/missing
 */
export function checkProfileCompleteness(
  profile: Partial<EmployerProfile> | null | undefined
): ProfileCompletenessResult {
  if (!profile) {
    return {
      isComplete: false,
      missingFields: Object.keys(REQUIRED_FIELDS),
      score: 0,
      details: Object.entries(REQUIRED_FIELDS).map(([field, config]) => ({
        field,
        label: config.label,
        completed: false,
        currentLength: 0,
        requiredLength: config.minLength,
      })),
    };
  }

  const details = Object.entries(REQUIRED_FIELDS).map(([field, config]) => {
    const value = profile[field as keyof EmployerProfile] as string | undefined;
    const currentLength = value?.length ?? 0;
    const completed = isFieldComplete(field as RequiredFieldKey, value);

    return {
      field,
      label: config.label,
      completed,
      currentLength,
      requiredLength: config.minLength,
    };
  });

  const missingFields = details
    .filter((d) => !d.completed)
    .map((d) => d.field);

  const completedCount = details.filter((d) => d.completed).length;
  const score = Math.round((completedCount / details.length) * 100);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    score,
    details,
  };
}

/**
 * Determine if an employer can create postings
 * Requirements: profileComplete AND (subscription.active OR status === "approved")
 */
export function canPost(
  profile: EmployerProfile | null | undefined
): CanPostResult {
  if (!profile) {
    return {
      allowed: false,
      reason: "No employer profile found",
      code: "PROFILE_INCOMPLETE",
    };
  }

  // Check profile completeness first
  const completeness = checkProfileCompleteness(profile);
  if (!completeness.isComplete) {
    const missingLabels = completeness.details
      .filter((d) => !d.completed)
      .map((d) => d.label)
      .join(", ");
    return {
      allowed: false,
      reason: `Profile incomplete. Missing: ${missingLabels}`,
      code: "PROFILE_INCOMPLETE",
    };
  }

  // Check subscription or approval status
  const hasActiveSubscription = profile.subscription?.active === true;
  const isApproved = profile.status === "approved";

  if (hasActiveSubscription) {
    // Paid users with complete profiles can post
    return { allowed: true };
  }

  if (isApproved) {
    // Approved users (even without active subscription) can post
    // This covers free posting grants, grandfathered orgs, etc.
    return { allowed: true };
  }

  // Profile is complete but not approved and no subscription
  return {
    allowed: false,
    reason: "Profile pending approval. Purchase a subscription for immediate access, or wait for admin review.",
    code: "NOT_APPROVED",
  };
}

/**
 * Determine the appropriate status for a profile based on completeness
 * Used when saving/publishing profiles
 */
export function determineProfileStatus(
  profile: Partial<EmployerProfile>,
  currentStatus?: string
): "incomplete" | "pending" {
  // If already approved/rejected/deleted, don't change
  if (currentStatus === "approved" || currentStatus === "rejected" || currentStatus === "deleted") {
    return currentStatus as "incomplete" | "pending"; // Type assertion for return, actual value preserved
  }

  const completeness = checkProfileCompleteness(profile);
  return completeness.isComplete ? "pending" : "incomplete";
}

/**
 * Get human-readable message for missing fields
 */
export function getMissingFieldsMessage(
  result: ProfileCompletenessResult
): string {
  if (result.isComplete) {
    return "Profile is complete!";
  }

  const missing = result.details
    .filter((d) => !d.completed)
    .map((d) => {
      if (d.requiredLength && d.requiredLength > 1) {
        return `${d.label} (${d.currentLength}/${d.requiredLength} characters)`;
      }
      return d.label;
    });

  if (missing.length === 1) {
    return `Please complete: ${missing[0]}`;
  }

  return `Please complete the following: ${missing.join(", ")}`;
}
