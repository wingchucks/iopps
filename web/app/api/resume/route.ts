import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb || !adminStorage) return NextResponse.json({ error: "Not initialized" }, { status: 500 });

  const formData = await request.formData();
  const file = formData.get("resume") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate file type and size
  const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. PDF or Word documents only." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Maximum 5MB." }, { status: 400 });
  }

  const uid = authResult.decodedToken.uid;
  const ext = file.name.split(".").pop() || "pdf";
  const filePath = `resumes/${uid}/resume.${ext}`;

  const bucket = adminStorage.bucket();
  const fileRef = bucket.file(filePath);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fileRef.save(buffer, { metadata: { contentType: file.type } });
  await fileRef.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

  // Update user profile with resume URL
  await adminDb.collection("users").doc(uid).update({
    resumeURL: url,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ url });
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb || !adminStorage) return NextResponse.json({ error: "Not initialized" }, { status: 500 });

  const uid = authResult.decodedToken.uid;

  // Delete file from storage
  const bucket = adminStorage.bucket();
  try {
    const [files] = await bucket.getFiles({ prefix: `resumes/${uid}/` });
    await Promise.all(files.map((f) => f.delete()));
  } catch {
    // File may not exist, that's fine
  }

  // Clear resume URL from profile
  await adminDb.collection("users").doc(uid).update({
    resumeURL: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
