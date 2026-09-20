import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

import { submitApplication } from "@/lib/server/application-submission";
import { archiveApplicationResume } from "@/lib/server/application-document-archive";
import { applicationReceiptRecord } from "@/lib/application-receipt";
import { getStorage } from "firebase-admin/storage";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;
  const emailVerificationRequired = new Error("Please verify your email address before applying.");
  try {
    if (Number(request.headers.get("content-length") || 0) > 100000) return NextResponse.json({ error: "Application too large" }, { status: 413 });
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({error:"Invalid application"}, {status:400});
    let archive: Promise<string> | undefined;
    const originalResumeUrl = input.resumeUrl;
    const verifyDocuments = async () => {
    // This callback runs only for a new submission, before archive/transaction writes.
    // Keep authenticated immutable retries and receipt/withdrawal access available.
    if (auth.decodedToken.firebase?.sign_in_provider === "password" && auth.decodedToken.email_verified !== true) {
      throw emailVerificationRequired;
    }
    if (input.resumeUrl) {
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!bucketName) throw new Error("Storage is not configured");
      const bucket = getStorage().bucket(bucketName);
      // Reuse the same copy across transaction retries, never re-read a mutable source.
      archive ??= archiveApplicationResume(bucket, originalResumeUrl, auth.decodedToken.uid, process.env.FIREBASE_STORAGE_EMULATOR_HOST);
      input.resumeUrl = await archive;
    }
    };
    const result = await submitApplication(getAdminDb(), auth.decodedToken.uid, input, verifyDocuments);
    const persisted = await getAdminDb().collection("applications").doc(result.application.id).get();
    if (!persisted.exists) throw new Error("Application receipt is not available");
    return NextResponse.json({created:result.created, application:serialize(applicationReceiptRecord({...persisted.data(),id:persisted.id}))}, {status:result.created ? 201 : 200, headers:{"Cache-Control":"private, no-store"}});
  } catch (error) {
    if (error === emailVerificationRequired) {
      return NextResponse.json({ error: emailVerificationRequired.message, code: "auth/email-not-verified" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Unable to submit application.";
    const safe = /^(A resume|A cover letter|References are|This job|Apply using|Invalid (job|resume)|Application ownership)/.test(message);
    return NextResponse.json({error: safe ? message : "Unable to submit application. Please try again."}, {status:safe ? 422 : 503});
  }
}

function serialize(value: unknown): unknown {
  if (value && typeof value === "object" && "toDate" in value) {
    return { seconds: Math.floor((value as { toDate(): Date }).toDate().getTime() / 1000) };
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, field]) => [key, serialize(field)]));
  }
  return value;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;
  try {
    const postId = request.nextUrl.searchParams.get("postId");
    const appId = request.nextUrl.searchParams.get("appId");
    if (appId && (appId.includes("/") || appId.length > 500)) return NextResponse.json({error:"Invalid application identifier"}, {status:400});
    if (postId || appId) {
      if (postId && (postId.includes("/") || postId.length > 300)) return NextResponse.json({error:"Invalid job identifier"}, {status:400});
      const snapshot = await getAdminDb().collection("applications").doc(appId || `${auth.decodedToken.uid}_${postId}`).get();
      const data = snapshot.data();
      if (!data || data.userId !== auth.decodedToken.uid) return NextResponse.json({application:null}, {headers:{"Cache-Control":"private, no-store"}});
      return NextResponse.json({application:serialize(applicationReceiptRecord({...data,id:snapshot.id}))}, {headers:{"Cache-Control":"private, no-store"}});
    }
    // Ownership comes only from the verified identity, never a query parameter.
    const snapshot = await getAdminDb().collection("applications")
      .where("userId", "==", auth.decodedToken.uid).orderBy("appliedAt", "desc").get();
    const applications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return serialize({ id: doc.id, userId: data.userId, postId: data.postId,
        postTitle: data.postTitle, orgName: data.orgName, status: data.status,
        statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory.map((entry: Record<string, unknown>) => ({ status: entry.status, timestamp: entry.timestamp })) : [], appliedAt: data.appliedAt,
        updatedAt: data.updatedAt });
    });
    return NextResponse.json({ applications }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to load applicant history:", error);
    return NextResponse.json({ error: "Unable to load applications" }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;
  try {
    const body = await request.json();
    if (body.action !== "withdraw" || typeof body.appId !== "string" || !body.appId || body.appId.includes("/") || body.appId.length > 500) {
      return NextResponse.json({ error: "Invalid withdrawal" }, { status: 400 });
    }
    const db = getAdminDb();
    const status = await db.runTransaction(async tx => {
      const ref = db.collection("applications").doc(body.appId);
      const snapshot = await tx.get(ref);
      const data = snapshot.data();
      if (!data || data.userId !== auth.decodedToken.uid) return 404;
      if (data.status === "withdrawn") return 200;
      if (!["submitted", "reviewing", "shortlisted", "interview"].includes(data.status)) return 409;
      tx.update(ref, { status: "withdrawn", updatedAt: FieldValue.serverTimestamp(), statusHistory: [...(Array.isArray(data.statusHistory) ? data.statusHistory : []), { status: "withdrawn", timestamp: Timestamp.now() }] });
      return 200;
    });
    return NextResponse.json(status === 200 ? { success: true } : { error: status === 404 ? "Application not found" : "This application cannot be withdrawn" }, { status, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to withdraw application" }, { status: 503 });
  }
}
