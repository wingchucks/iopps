import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  TeamActivityLog,
  TeamActivityAction,
  TeamActivityResource,
} from "@/lib/types";

const COLLECTION = "team_activity_logs";

interface LogActivityParams {
  organizationId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatarUrl?: string;
  action: TeamActivityAction;
  resource: TeamActivityResource;
  resourceId: string;
  resourceTitle: string;
  details?: Record<string, unknown>;
}

/**
 * Log a team activity
 */
export async function logTeamActivity(params: LogActivityParams): Promise<string> {
  if (!db) throw new Error("Database not available");
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...params,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

/**
 * Helper to log activity with user info from auth
 */
export async function logActivity(
  organizationId: string,
  user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null },
  action: TeamActivityAction,
  resource: TeamActivityResource,
  resourceId: string,
  resourceTitle: string,
  details?: Record<string, unknown>
): Promise<string> {
  return logTeamActivity({
    organizationId,
    userId: user.uid,
    userName: user.displayName || user.email || "Unknown User",
    userEmail: user.email || undefined,
    userAvatarUrl: user.photoURL || undefined,
    action,
    resource,
    resourceId,
    resourceTitle,
    details,
  });
}

interface ListActivitiesOptions {
  organizationId: string;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
  userId?: string;
  resource?: TeamActivityResource;
  action?: TeamActivityAction;
}

/**
 * List team activities for an organization
 */
export async function listTeamActivities(
  options: ListActivitiesOptions
): Promise<{ activities: TeamActivityLog[]; lastDoc: DocumentSnapshot | null }> {
  if (!db) throw new Error("Database not available");

  const {
    organizationId,
    pageSize = 20,
    lastDoc,
    userId,
    resource,
    action,
  } = options;

  let q = query(
    collection(db, COLLECTION),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  // Add optional filters
  if (userId) {
    q = query(q, where("userId", "==", userId));
  }
  if (resource) {
    q = query(q, where("resource", "==", resource));
  }
  if (action) {
    q = query(q, where("action", "==", action));
  }

  // Pagination
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const activities: TeamActivityLog[] = [];
  let newLastDoc: DocumentSnapshot | null = null;

  snapshot.forEach((doc) => {
    activities.push({ id: doc.id, ...doc.data() } as TeamActivityLog);
    newLastDoc = doc;
  });

  return { activities, lastDoc: newLastDoc };
}

/**
 * Get recent activities for dashboard widget
 */
export async function getRecentActivities(
  organizationId: string,
  count: number = 10
): Promise<TeamActivityLog[]> {
  const { activities } = await listTeamActivities({
    organizationId,
    pageSize: count,
  });
  return activities;
}

/**
 * Format activity for display
 */
export function formatActivityMessage(activity: TeamActivityLog): string {
  const actionVerbs: Record<TeamActivityAction, string> = {
    created: "created",
    updated: "updated",
    deleted: "deleted",
    published: "published",
    unpublished: "unpublished",
    duplicated: "duplicated",
    archived: "archived",
  };

  const resourceNames: Record<TeamActivityResource, string> = {
    job: "job posting",
    training_program: "training program",
    event: "event",
    conference: "conference",
    product: "product",
    service: "service",
    scholarship: "scholarship",
    grant: "grant",
    team_member: "team member",
    settings: "settings",
  };

  const verb = actionVerbs[activity.action];
  const resourceName = resourceNames[activity.resource];

  return `${verb} ${resourceName} "${activity.resourceTitle}"`;
}

/**
 * Get icon and color for activity action
 */
export function getActivityStyle(action: TeamActivityAction): { color: string; bgColor: string } {
  const styles: Record<TeamActivityAction, { color: string; bgColor: string }> = {
    created: { color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
    updated: { color: "text-blue-400", bgColor: "bg-blue-500/20" },
    deleted: { color: "text-red-400", bgColor: "bg-red-500/20" },
    published: { color: "text-green-400", bgColor: "bg-green-500/20" },
    unpublished: { color: "text-amber-400", bgColor: "bg-amber-500/20" },
    duplicated: { color: "text-purple-400", bgColor: "bg-purple-500/20" },
    archived: { color: "text-slate-400", bgColor: "bg-slate-500/20" },
  };
  return styles[action];
}
