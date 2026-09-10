import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

import { submitApplication } from "@/lib/server/application-submission";
import { archiveApplicationResume } from "@/lib/server/application-document-archive";
import { applicationReceiptRecord } from "@/lib/application-receipt";
import { getStorage } from "firebase-admin/storage";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;
  try {
    if (Number(request.headers.get("content-length") || 0) > 100000) return NextResponse.json({ error: "Application too large" }, { status: 413 });
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({error:"Invalid application"}, {status:400});
    let archive: Promise<string> | undefined;
    const originalResumeUrl = input.resumeUrl;
    const verifyDocuments = async () => {
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
    if (postId) {
      if (postId.includes("/") || postId.length > 300) return NextResponse.json({error:"Invalid job identifier"}, {status:400});
      const snapshot = await getAdminDb().collection("applications").doc(`${auth.decodedToken.uid}_${postId}`).get();
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
        statusHistory: data.statusHistory || [], appliedAt: data.appliedAt,
        updatedAt: data.updatedAt });
    });
    return NextResponse.json({ applications }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to load applicant history:", error);
    return NextResponse.json({ error: "Unable to load applications" }, { status: 503 });
  }
}
