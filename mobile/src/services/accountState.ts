/**
 * Account State Service
 *
 * Centralized logic for determining user account state based on:
 * - users/{uid}.role
 * - employers/{uid}.status
 *
 * This ensures consistent routing throughout the app.
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { EmployerProfile, UserProfile } from "../types";

/**
 * Account states for routing decisions
 */
export enum AccountState {
  /** Regular community member - show community dashboard/profile */
  COMMUNITY = "COMMUNITY",
  /** Has employer profile with status="pending" - show employer dashboard with pending banner */
  EMPLOYER_PENDING = "EMPLOYER_PENDING",
  /** Approved employer - full employer dashboard access */
  EMPLOYER_APPROVED = "EMPLOYER_APPROVED",
  /** Vendor user - has vendor profile */
  VENDOR = "VENDOR",
  /** Admin user */
  ADMIN = "ADMIN",
}

export interface AccountStateResult {
  state: AccountState;
  userProfile: UserProfile | null;
  employerProfile: EmployerProfile | null;
  role: string;
}

/**
 * Resolves the account state for a user by checking both:
 * 1. users/{uid} document for role
 * 2. employers/{uid} document for employer status
 *
 * This is the single source of truth for routing decisions.
 */
export async function resolveAccountState(uid: string): Promise<AccountStateResult> {
  // Default result
  const result: AccountStateResult = {
    state: AccountState.COMMUNITY,
    userProfile: null,
    employerProfile: null,
    role: "user",
  };

  try {
    // Fetch user profile
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      result.userProfile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
      result.role = result.userProfile.role || "user";
    }

    // Fetch employer profile (may exist even if role isn't "employer" yet - for pending employers)
    const employerDoc = await getDoc(doc(db, "employers", uid));
    if (employerDoc.exists()) {
      result.employerProfile = { id: employerDoc.id, ...employerDoc.data() } as EmployerProfile;
    }

    // Determine account state based on role and employer profile
    result.state = determineAccountState(result.role, result.employerProfile);

    return result;
  } catch (error) {
    console.error("[resolveAccountState] Error fetching account data:", error);
    return result;
  }
}

/**
 * Determines the account state from role and employer profile.
 * This is a pure function for easy testing.
 */
export function determineAccountState(
  role: string,
  employerProfile: EmployerProfile | null
): AccountState {
  // Admin takes priority
  if (role === "admin") {
    return AccountState.ADMIN;
  }

  // Check for vendor role
  if (role === "vendor") {
    return AccountState.VENDOR;
  }

  // Check employer status
  if (role === "employer") {
    // Role is employer - check if approved
    if (employerProfile?.status === "approved") {
      return AccountState.EMPLOYER_APPROVED;
    }
    // Employer role but not approved (shouldn't happen normally, but handle gracefully)
    if (employerProfile?.status === "pending") {
      return AccountState.EMPLOYER_PENDING;
    }
    // Employer role but no profile or rejected - treat as pending for safety
    return AccountState.EMPLOYER_PENDING;
  }

  // Role is "user" but has employer profile - this is a pending employer
  if (employerProfile) {
    if (employerProfile.status === "pending") {
      return AccountState.EMPLOYER_PENDING;
    }
    if (employerProfile.status === "approved") {
      // Has approved profile but role not updated yet - treat as approved
      return AccountState.EMPLOYER_APPROVED;
    }
    // Rejected employer profile - treat as community
    if (employerProfile.status === "rejected") {
      return AccountState.COMMUNITY;
    }
  }

  // Default: community user
  return AccountState.COMMUNITY;
}

/**
 * Helper to check if user can access employer features
 */
export function canAccessEmployerDashboard(state: AccountState): boolean {
  return (
    state === AccountState.EMPLOYER_APPROVED ||
    state === AccountState.EMPLOYER_PENDING ||
    state === AccountState.ADMIN
  );
}

/**
 * Helper to check if user is a pending employer (needs approval banner)
 */
export function isEmployerPending(state: AccountState): boolean {
  return state === AccountState.EMPLOYER_PENDING;
}

/**
 * Helper to check if user is an approved employer
 */
export function isEmployerApproved(state: AccountState): boolean {
  return state === AccountState.EMPLOYER_APPROVED || state === AccountState.ADMIN;
}
