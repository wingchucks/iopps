import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = "community" | "employer" | "moderator" | "admin";

const VALID_ROLES: ReadonlySet<string> = new Set([
  "community",
  "employer",
  "moderator",
  "admin",
]);

interface UpdateUserRoleBody {
  userId: string;
  role: UserRole;
}

// ---------------------------------------------------------------------------
// GET /api/admin/users
// ---------------------------------------------------------------------------

/**
 * List users with optional role filter.
 *
 * Query params:
 *   role - "community" | "employer" | "moderator" | "admin" (optional)
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = request.nextUrl;
    const role = searchParams.get("role") as UserRole | null;

    let query = adminDb
      .collection("users")
      .orderBy("createdAt", "desc")
      .limit(100);

    if (role) {
      if (!VALID_ROLES.has(role)) {
        return NextResponse.json(
          { error: "Invalid role filter. Must be: community, employer, moderator, or admin" },
          { status: 400 }
        );
      }

      query = adminDb
        .collection("users")
        .where("role", "==", role)
        .orderBy("createdAt", "desc")
        .limit(100);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[GET /api/admin/users] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/users
// ---------------------------------------------------------------------------

/**
 * Update a user's role.
 *
 * Body:
 *   userId - the document ID of the user
 *   role   - the new role to assign
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as UpdateUserRoleBody;

    if (!body.userId || typeof body.userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (!body.role || !VALID_ROLES.has(body.role)) {
      return NextResponse.json(
        { error: "role must be one of: community, employer, moderator, admin" },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("users").doc(body.userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await userRef.update({
      role: body.role,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      userId: body.userId,
      role: body.role,
    });
  } catch (error) {
    console.error("[POST /api/admin/users] Error:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
