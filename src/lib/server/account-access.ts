import type { DecodedIdToken, UserRecord } from "firebase-admin/auth";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { getUserAccessBlockReason } from "@/lib/access-state";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

type UserDocData = Record<string, unknown>;

export class AccountAccessError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 403, code = "account_blocked") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface ActiveUserAccessContext {
  authUser: UserRecord | null;
  email: string | null;
  userData: UserDocData;
}

export interface AccountAccessDeps {
  auth?: Pick<Auth, "getUser">;
  db?: Pick<Firestore, "collection">;
}

function isUserNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "auth/user-not-found"
  );
}

async function getAuthUserOrNull(
  uid: string,
  auth: Pick<Auth, "getUser">,
): Promise<UserRecord | null> {
  try {
    return await auth.getUser(uid);
  } catch (error) {
    if (isUserNotFoundError(error)) return null;
    throw error;
  }
}

export async function assertUserCanAccessApp(
  decodedToken: Pick<DecodedIdToken, "uid" | "email">,
  deps: AccountAccessDeps = {},
): Promise<ActiveUserAccessContext> {
  const auth = deps.auth ?? getAdminAuth();
  const db = deps.db ?? getAdminDb();

  const [authUser, userDoc] = await Promise.all([
    getAuthUserOrNull(decodedToken.uid, auth),
    db.collection("users").doc(decodedToken.uid).get(),
  ]);

  const userData = (userDoc.data() ?? {}) as UserDocData;
  const blockReason = getUserAccessBlockReason(userData, {
    authDisabled: authUser?.disabled === true,
    authMissing: authUser === null,
  });

  if (blockReason) {
    throw new AccountAccessError(blockReason);
  }

  return {
    authUser,
    email: authUser?.email ?? decodedToken.email ?? null,
    userData,
  };
}
