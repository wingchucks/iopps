import { OutboundFetchError, safeOutboundFetch } from "@/lib/server/safe-outbound-fetch";
import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";
import {
  PROFILE_MEDIA_MAX_BYTES,
  buildProfileMediaStoragePath,
  inferProfileMediaMimeType,
  isAllowedProfileMediaMimeType,
  normalizeCloudImportUrl,
  resolveImportedProfileMediaFileName,
  type ProfileMediaSlot,
} from "@/lib/profile-media";

export const runtime = "nodejs";

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

/**
 * Organization images are public brand assets: only an owner or admin of an
 * organization that still has access (verified, unrevoked session; not disabled,
 * deleted or archived) may change them.
 */
async function resolveOrgAccess(request: NextRequest): Promise<OrgAccessContext> {
  const context = await requireEmployerContext(request);
  if (!["owner", "admin"].includes(context.orgRole)) {
    throw new UploadRouteError(403, "An organization owner or admin can change organization images.");
  }
  return { uid: context.uid, orgId: context.orgId };
}

// The bytes, not the client's declared type or file name, decide what is stored.
// SVG and every other non-raster format is refused.
const IMAGE_SIGNATURES: Array<{ type: string; matches: (bytes: Buffer) => boolean }> = [
  { type: "image/jpeg", matches: b => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", matches: b => b.length > 7 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/webp", matches: b => b.length > 11 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { type: "image/gif", matches: b => b.length > 5 && ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("ascii")) },
];

function detectImageType(bytes: Buffer): string | null {
  return IMAGE_SIGNATURES.find(signature => signature.matches(bytes))?.type ?? null;
}

function parseProfileMediaSlot(value: unknown): ProfileMediaSlot {
  if (value === "logo" || value === "banner" || value === "gallery") {
    return value;
  }

  throw new UploadRouteError(400, "Invalid media slot");
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
  const response = await safeOutboundFetch(args.url, {
    authorization: args.authorization,
    maxBytes: PROFILE_MEDIA_MAX_BYTES,
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

  const buffer = response.body;
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
  const contentType = detectImageType(buffer);
  if (!contentType) {
    throw new UploadRouteError(400, "The file content is not a JPEG, PNG, WebP or GIF image");
  }
  const payload = await persistProfileMedia({
    orgId: access.orgId,
    uid: access.uid,
    slot,
    buffer,
    contentType,
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

  const metadataResponse = await safeOutboundFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size&supportsAllDrives=true`,
    {
      authorization: `Bearer ${accessToken}`,
      maxBytes: 64 * 1024,
      validateUrl: (url) => {
        if (url.origin !== "https://www.googleapis.com") throw new OutboundFetchError("Unsupported Drive metadata destination");
      },
    }
  );

  if (!metadataResponse.ok) {
    if (metadataResponse.status === 401 || metadataResponse.status === 403) {
      throw new UploadRouteError(400, "Google Drive access expired. Please reconnect and try again.");
    }
    throw new UploadRouteError(400, "Unable to access the selected Google Drive image");
  }

  const metadata = JSON.parse(metadataResponse.body.toString("utf8")) as {
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

// The former signed-URL flow let a browser write any image type, of any size, over
// the live org-logos/{orgId} and org-banners/{orgId} objects. Nothing calls it now:
// the dashboard posts the file here, and signup uploads go through Storage rules.
const LEGACY_UPLOAD_RETIRED = {
  error: "This upload method has been retired. Upload the image from your organization profile instead.",
  code: "ENDPOINT_RETIRED",
};

function respondWithRouteError(error: unknown) {
  if (error instanceof OutboundFetchError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof UploadRouteError || error instanceof EmployerApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Upload failed";
  console.error("[org/upload]", error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  try {
    const access = await resolveOrgAccess(request);
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

    return NextResponse.json(LEGACY_UPLOAD_RETIRED, { status: 410 });
  } catch (error) {
    return respondWithRouteError(error);
  }
}

export async function PUT() {
  return NextResponse.json(LEGACY_UPLOAD_RETIRED, { status: 410 });
}
