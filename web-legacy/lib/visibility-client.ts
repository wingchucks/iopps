/**
 * Client-side visibility utilities
 *
 * Use these functions to trigger visibility recomputation from the frontend
 * after job operations (publish, archive, featured toggle, delete).
 */

import { auth } from "@/lib/firebase";

/**
 * Trigger visibility recomputation for an organization
 *
 * Call this after:
 * - Publishing a job (including via subscription credits or free grant)
 * - Archiving/pausing a job
 * - Toggling featured status
 * - Deleting a job
 *
 * @param orgId - The organization ID to recompute visibility for
 * @returns Promise with the visibility result
 */
export async function triggerVisibilityRecompute(
  orgId: string
): Promise<{
  success: boolean;
  isDirectoryVisible?: boolean;
  visibilityReason?: string;
  directoryVisibleUntil?: string | null;
  error?: string;
}> {
  try {
    // Get current user's auth token
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const token = await currentUser.getIdToken();

    const response = await fetch("/api/visibility/recompute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orgId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error("[triggerVisibilityRecompute] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Wrapper for job operations that automatically triggers visibility recompute
 *
 * Usage:
 * ```
 * await withVisibilityRecompute(employerId, async () => {
 *   await publishJob(jobId);
 * });
 * ```
 */
export async function withVisibilityRecompute<T>(
  orgId: string,
  operation: () => Promise<T>
): Promise<T> {
  const result = await operation();

  // Trigger recompute in background (don't block on it)
  triggerVisibilityRecompute(orgId).catch((error) => {
    console.warn("[withVisibilityRecompute] Failed to recompute:", error);
  });

  return result;
}
