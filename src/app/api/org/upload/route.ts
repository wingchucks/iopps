import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  PROFILE_MEDIA_MAX_BYTES,
  buildProfileMediaStoragePath,
  inferProfileMediaMimeType,
  isAllowedProfileMediaMimeType,
  isBlockedRemoteHostname,
  isPrivateIpAddress,
  normalizeCloudImportUrl,
  resolveImportedProfileMediaFileName,
  type ProfileMediaSlot,
} from "@/lib/profile-media";

export const runtime = "nodejs";

type LegacyUploadType = "logo" | "banner";

interface OrgAccessContext {
  uid: string;
  orgId: string;
}

interface UploadedAssetResponse {
  url: string;
  asset: {
    slot: ProfileMediaSlot;
    path: string;
    contentType: string;
    size: number;
    originalName?: string;
  };
}

class UploadRouteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getBucketName(): string {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new UploadRouteError(500, "Storage bucket is not configured");
  }
  return bucketName;
}

async function resolveOrgAccess(uid: string): Promise<OrgAccessContext> {
  const db = getAdminDb();
  const memberSnap = await db.collection("members").doc(uid).get();
  const memberOrgId = memberSnap.exists ? memberSnap.data()?.orgId : null;

  if (memberOrgId) {
    return { uid, orgId: memberOrgId };
  }

  const userSnap = await db.collection("users").doc(uid).get();
  const employerId = userSnap.exists ? userSnap.data()?.employerId : null;
  if (employerId) {
    return { uid, orgId: employerId };
  }

  throw new UploadRouteError(403, "Not an organization member");
}

function parseProfileMediaSlot(value: unknown): ProfileMediaSlot {
  if (value === "logo" || value === "banner" || value === "gallery") {
    return value;
  }

  throw new UploadRouteError(400, "Invalid media slot");
}

function parseLegacyUploadType(value: unknown): LegacyUploadType {
  if (value === "logo" || value === "banner") {
    return value;
  }

  throw new UploadRouteError(400, "Invalid type");
}

function validateUploadedImage(contentType: string, size: number) {
  if (!isAllowedProfileMediaMimeType(contentType)) {
    throw new UploadRouteError(400, "Only JPEG, PNG, WebP, and GIF images are allowed");
  }

  if (size > PROFILE_MEDIA_MAX_BYTES) {
    throw new UploadRouteError(400, "File too large (max 5MB)");
  }
}

async function persistProfileMedia(args: {
  orgId: string;
  uid: string;
  slot: ProfileMediaSlot;
  buffer: Buffer;
  contentType: string;
  size: number;
  originalName?: string;
  source: string;
}): Promise<UploadedAssetResponse> {
  validateUploadedImage(args.contentType, args.size);

  const bucket = getStorage().bucket(getBucketName());
  const path = buildProfileMediaStoragePath({
    orgId: args.orgId,
    slot: args.slot,
    fileName: args.originalName,
  });
  const file = bucket.file(path);

  await file.save(args.buffer, {
    metadata: {
      contentType: args.contentType,
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        orgId: args.orgId,
        uploadedBy: args.uid,
        slot: args.slot,
        source: args.source,
      },
    },
    resumable: false,
  });

  await file.makePublic();

  return {
    url: `https://storage.googleapis.com/${bucket.name}/${path}`,
    asset: {
      slot: args.slot,
      path,
      contentType: args.contentType,
      size: args.size,
      ...(args.originalName ? { originalName: args.originalName } : {}),
    },
  };
}

async function assertSafeRemoteUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") {
    throw new UploadRouteError(400, "Only HTTPS image links are supported");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedRemoteHostname(hostname)) {
    throw new UploadRouteError(400, "Private or local network URLs are not allowed");
  }

  if (isIP(hostname) && isPrivateIpAddress(hostname)) {
    throw new UploadRouteError(400, "Private or local network URLs are not allowed");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new UploadRouteError(400, "Private or local network URLs are not allowed");
  }
}

async function fetchRemoteImage(args: {
  url: string;
  originalUrl?: string;
  originalName?: string;
  authorization?: string;
  fallbackBase: string;
}): Promise<{
  buffer: Buffer;
  contentType: string;
  size: number;
  originalName: string;
}> {
  await assertSafeRemoteUrl(args.url);

  const response = await fetch(args.url, {
    headers: args.authorization ? { Authorization: args.authorization } : undefined,
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new UploadRouteError(400, "The selected file is not accessible");
    }
    if (response.status === 404) {
      throw new UploadRouteError(404, "The selected image could not be found");
    }
    throw new UploadRouteError(400, "Failed to download the selected image");
  }

  if (response.url) {
    await assertSafeRemoteUrl(response.url);
  }

  const headerType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const inferredType =
    inferProfileMediaMimeType(headerType) ||
    inferProfileMediaMimeType(args.originalName) ||
    inferProfileMediaMimeType(args.originalUrl) ||
    inferProfileMediaMimeType(response.url);

  if (!inferredType || !isAllowedProfileMediaMimeType(inferredType)) {
    throw new UploadRouteError(400, "Imported link must resolve to a supported image");
  }

  const contentLength = Number.parseInt(response.headers.get("content-length") || "", 10);
  if (Number.isFinite(contentLength) && contentLength > PROFILE_MEDIA_MAX_BYTES) {
    throw new UploadRouteError(400, "File too large (max 5MB)");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  validateUploadedImage(inferredType, buffer.byteLength);

  const originalName = resolveImportedProfileMediaFileName({
    originalName: args.originalName,
    importUrl: response.url || args.originalUrl || args.url,
    contentDisposition: response.headers.get("content-disposition"),
    contentType: inferredType,
    fallbackBase: args.fallbackBase,
  });

  return {
    buffer,
    contentType: inferredType,
    size: buffer.byteLength,
    originalName,
  };
}

async function handleLocalUpload(request: NextRequest, access: OrgAccessContext) {
  const formData = await request.formData();
  const slot = parseProfileMediaSlot(formData.get("slot"));
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new UploadRouteError(400, "No file provided");
  }

  validateUploadedImage(file.type, file.size);

  const buffer = Buffer.from(await file.arrayBuffer());
  const payload = await persistProfileMedia({
    orgId: access.orgId,
    uid: access.uid,
    slot,
    buffer,
    contentType: file.type,
    size: buffer.byteLength,
    originalName: file.name,
    source: "local",
  });

  return NextResponse.json(payload);
}

async function handleLinkImport(body: Record<string, unknown>, access: OrgAccessContext) {
  const slot = parseProfileMediaSlot(body.slot);
  const normalized = normalizeCloudImportUrl(String(body.url || ""));
  const remoteImage = await fetchRemoteImage({
    url: normalized.url,
    originalUrl: normalized.originalUrl,
    fallbackBase: slot,
  });

  const payload = await persistProfileMedia({
    orgId: access.orgId,
    uid: access.uid,
    slot,
    buffer: remoteImage.buffer,
    contentType: remoteImage.contentType,
    size: remoteImage.size,
    originalName: remoteImage.originalName,
    source: normalized.source,
  });

  return NextResponse.json(payload);
}

async function handleGoogleDriveImport(body: Record<string, unknown>, access: OrgAccessContext) {
  const slot = parseProfileMediaSlot(body.slot);
  const fileId = typeof body.fileId === "string" ? body.fileId.trim() : "";
  const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";

  if (!fileId || !accessToken) {
    throw new UploadRouteError(400, "Google Drive import requires a file and access token");
  }

  const metadataResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  if (!metadataResponse.ok) {
    if (metadataResponse.status === 401 || metadataResponse.status === 403) {
      throw new UploadRouteError(400, "Google Drive access expired. Please reconnect and try again.");
    }
    throw new UploadRouteError(400, "Unable to access the selected Google Drive image");
  }

  const metadata = (await metadataResponse.json()) as {
    name?: string;
    mimeType?: string;
    size?: string;
  };

  if (!isAllowedProfileMediaMimeType(metadata.mimeType)) {
    throw new UploadRouteError(400, "Google Drive selection must be a supported image");
  }

  const size = Number.parseInt(metadata.size || "", 10);
  if (Number.isFinite(size) && size > PROFILE_MEDIA_MAX_BYTES) {
    throw new UploadRouteError(400, "File too large (max 5MB)");
  }

  const remoteImage = await fetchRemoteImage({
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    authorization: `Bearer ${accessToken}`,
    originalName: metadata.name,
    fallbackBase: slot,
  });

  const payload = await persistProfileMedia({
    orgId: access.orgId,
    uid: access.uid,
    slot,
    buffer: remoteImage.buffer,
    contentType: remoteImage.contentType,
    size: remoteImage.size,
    originalName: remoteImage.originalName,
    source: "google-drive",
  });

  return NextResponse.json(payload);
}

async function handleLegacySignedUpload(body: Record<string, unknown>, access: OrgAccessContext) {
  const type = parseLegacyUploadType(body.type);
  const contentType = typeof body.contentType === "string" ? body.contentType : "";

  if (!contentType.startsWith("image/")) {
    throw new UploadRouteError(400, "Must be an image");
  }

  const bucket = getStorage().bucket(getBucketName());
  const path = type === "logo" ? `org-logos/${access.orgId}` : `org-banners/${access.orgId}`;
  const blob = bucket.file(path);

  const [signedUrl] = await blob.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 10 * 60 * 1000,
    contentType,
  });

  return NextResponse.json({ signedUrl, path, orgId: access.orgId });
}

function respondWithRouteError(error: unknown) {
  if (error instanceof UploadRouteError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Upload failed";
  console.error("[org/upload]", error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;

  try {
    const access = await resolveOrgAccess(auth.decodedToken.uid);
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      return await handleLocalUpload(request, access);
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (body.source === "google-drive") {
      return await handleGoogleDriveImport(body, access);
    }

    if (body.source === "link") {
      return await handleLinkImport(body, access);
    }

    return await handleLegacySignedUpload(body, access);
  } catch (error) {
    return respondWithRouteError(error);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;

  try {
    const access = await resolveOrgAccess(auth.decodedToken.uid);
    const body = (await request.json()) as Record<string, unknown>;
    const type = parseLegacyUploadType(body.type);

    const bucket = getStorage().bucket(getBucketName());
    const path = type === "logo" ? `org-logos/${access.orgId}` : `org-banners/${access.orgId}`;
    const blob = bucket.file(path);

    await blob.makePublic();

    return NextResponse.json({
      url: `https://storage.googleapis.com/${bucket.name}/${path}`,
    });
  } catch (error) {
    return respondWithRouteError(error);
  }
}
