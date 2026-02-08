/**
 * Account Mode Utilities
 *
 * CRITICAL: This file enforces the hard separation between Community and Organization accounts.
 *
 * RULES:
 * - Community users: Browse/apply to jobs, save items, access /member/[userId] profile hub ONLY
 * - Employers/Organizations: Post jobs, manage org, access /organization dashboard ONLY
 * - No page may ever show Community UI ("My Dashboard") to an Employer/Organization account
 * - No page may ever show Organization UI to a Community account
 * - If role detection is ambiguous, treat as anonymous (no dashboard CTA)
 */

import type { UserRole } from "@/lib/types";

/**
 * Account mode representing the type of dashboard experience
 */
export type AccountMode = "community" | "organization" | "anonymous";

/**
 * Determines the account mode based on user authentication state and role.
 *
 * @param user - Firebase user object (null if not logged in)
 * @param role - User role from auth context (null if not determined)
 * @returns AccountMode - 'community', 'organization', or 'anonymous'
 *
 * FAIL-SAFE: Returns 'anonymous' if:
 * - User is not logged in
 * - Role is null/undefined
 * - Role is not recognized
 */
export function getAccountMode(
  user: { uid: string } | null,
  role: UserRole | null
): AccountMode {
  // Not logged in = anonymous
  if (!user) {
    return "anonymous";
  }

  // No role determined = treat as anonymous (fail-safe)
  if (!role) {
    return "anonymous";
  }

  // Organization/Employer accounts
  if (role === "employer") {
    return "organization";
  }

  // Community accounts
  if (role === "community") {
    return "community";
  }

  // Admin and moderator roles - treat as organization for dashboard purposes
  // They have access to admin panel but should see org dashboard if they have one
  if (role === "admin" || role === "moderator") {
    return "organization";
  }

  // Unknown role = anonymous (fail-safe)
  return "anonymous";
}

/**
 * Returns the appropriate dashboard URL based on account mode.
 *
 * @param mode - The account mode
 * @returns Dashboard URL or null if anonymous
 */
export function getDashboardUrl(mode: AccountMode): string | null {
  switch (mode) {
    case "community":
      return "/discover";
    case "organization":
      return "/organization";
    default:
      return null;
  }
}

/**
 * Returns the appropriate dashboard label based on account mode.
 *
 * @param mode - The account mode
 * @returns Dashboard label or null if anonymous
 */
export function getDashboardLabel(mode: AccountMode): string | null {
  switch (mode) {
    case "community":
      return "My Dashboard";
    case "organization":
      return "Organization Dashboard";
    default:
      return null;
  }
}

/**
 * Checks if the current user should see community-specific UI.
 * IMPORTANT: Returns false for organization accounts - they should NEVER see community UI.
 */
export function isCommunityUser(
  user: { uid: string } | null,
  role: UserRole | null
): boolean {
  return getAccountMode(user, role) === "community";
}

/**
 * Checks if the current user should see organization-specific UI.
 * IMPORTANT: Returns false for community accounts - they should NEVER see organization UI.
 */
export function isOrganizationUser(
  user: { uid: string } | null,
  role: UserRole | null
): boolean {
  return getAccountMode(user, role) === "organization";
}
