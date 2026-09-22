import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getUserAccessBlockReason } from "@/lib/access-state";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
// Match the existing member writer: validate types and allowlisted fields, not
// new length caps that reject supported setup drafts or prefilled legacy values.
const textFields = ["community", "location", "bio", "nation", "territory", "languages", "headline", "skillsText"] as const;

export async function POST(req: NextRequest) {
  const access = await verifyAuthToken(req);
  if (!access.success) return access.response;
  if (access.userData.signupIntent === "organization") {
    return NextResponse.json({ error: "Resume organization setup." }, { status: 409, headers });
  }
  let input;
  try { input = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid profile." }, { status: 400, headers });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "Invalid profile." }, { status: 400, headers });
  }
  const data: Record<string, unknown> = {};
  for (const key of textFields) {
    if (typeof input[key] !== "string") {
      return NextResponse.json({ error: `Invalid ${key}.`, field: key }, { status: 400, headers });
    }
    data[key] = input[key];
  }
  if (!Array.isArray(input.interests) || input.interests.some((value: unknown) => typeof value !== "string")) {
    return NextResponse.json({ error: "Invalid interests.", field: "interests" }, { status: 400, headers });
  }
  data.interests = [...new Set(input.interests)];
  // Old clients omit this field; preserve their existing career preferences.
  // An explicit empty array clears the selection atomically with completion.
  if (Object.hasOwn(input, "targetRoles")) {
    if (!Array.isArray(input.targetRoles) || input.targetRoles.some((value: unknown) => typeof value !== "string")) {
      return NextResponse.json({ error: "Invalid targetRoles.", field: "targetRoles" }, { status: 400, headers });
    }
    data.targetRoles = [...new Set(input.targetRoles)];
  }
  data.skills = input.skillsText.split(",").map((value: string) => value.trim()).filter(Boolean);
  try {
    const uid = access.decodedToken.uid;
    const db = getAdminDb();
    const memberRef = db.collection("members").doc(uid);
    const userRef = db.collection("users").doc(uid);
    // Profile fields and completion become visible together; never trust a body UID or role.
    const denial = await db.runTransaction(async transaction => {
      // Recheck the durable account in this transaction: initial authentication
      // can precede closure, suspension, permission changes or organization signup.
      const account = (await transaction.get(userRef)).data() ?? {};
      const blockReason = getUserAccessBlockReason(account);
      if (blockReason) return { error: blockReason, status: 403 };
      if (typeof account.claimsValidAfter === "number" && (
        !Number.isFinite(access.decodedToken.auth_time) || access.decodedToken.auth_time <= account.claimsValidAfter
      )) return { error: "Please sign in again after your account permissions changed.", status: 401 };
      if (account.signupIntent === "organization") {
        return { error: "Resume organization setup.", status: 409 };
      }
      const member = await transaction.get(memberRef);
      transaction.set(memberRef, {
        ...(!member.exists ? {
          uid, displayName: access.decodedToken.name || "", email: access.viewerEmail || "",
          joinedAt: FieldValue.serverTimestamp(),
        } : {}),
        ...data, updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(userRef, { setupComplete: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    if (denial) return NextResponse.json({ error: denial.error }, { status: denial.status, headers });
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ error: "Your profile could not be saved. Please retry." }, { status: 503, headers });
  }
}
