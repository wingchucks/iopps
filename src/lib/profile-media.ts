export const PROFILE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_MEDIA_MAX_GALLERY_ITEMS = 6;
export const PROFILE_MEDIA_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProfileMediaSlot = "logo" | "banner" | "gallery";
export type ProfileMediaCloudSource = "direct" | "google-drive" | "dropbox" | "onedrive";

export interface NormalizedCloudImport {
  source: ProfileMediaCloudSource;
  url: string;
  originalUrl: string;
  fileId?: string;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function isHex(value: string): boolean {
  return /^[0-9a-f]+$/i.test(value);
}

export function isAllowedProfileMediaMimeType(value: string | null | undefined): boolean {
  if (!value) return false;
  return PROFILE_MEDIA_ALLOWED_MIME_TYPES.includes(value.toLowerCase() as (typeof PROFILE_MEDIA_ALLOWED_MIME_TYPES)[number]);
}

export function inferProfileMediaMimeType(candidate: string | null | undefined): string | undefined {
  if (!candidate) return undefined;

  const lower = candidate.toLowerCase();
  if (isAllowedProfileMediaMimeType(lower)) return lower;

  const sanitized = lower.split("?")[0].split("#")[0];
  const extension = sanitized.includes(".") ? sanitized.split(".").pop() : undefined;
  if (!extension) return undefined;

  return MIME_BY_EXTENSION[extension];
}

export function extractGoogleDriveFileId(url: URL): string | undefined {
  const pathname = url.pathname;
  const pathMatch = pathname.match(/\/file\/d\/([^/]+)/i);
  if (pathMatch?.[1]) return pathMatch[1];

  const openId = url.searchParams.get("id");
  if (openId) return openId;

  const segments = pathname.split("/").filter(Boolean);
  const ucIndex = segments.findIndex((segment) => segment === "d");
  if (ucIndex >= 0 && segments[ucIndex + 1]) {
    return segments[ucIndex + 1];
  }

  return undefined;
}

export function normalizeCloudImportUrl(value: string): NormalizedCloudImport {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Enter an image link to import");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid HTTPS image link");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS image links are supported");
  }

  const hostname = parsed.hostname.toLowerCase();
  const originalUrl = parsed.toString();

  if (hostname === "drive.google.com" || hostname === "docs.google.com") {
    const fileId = extractGoogleDriveFileId(parsed);
    if (!fileId) {
      throw new Error("Google Drive link must point to a specific file");
    }

    return {
      source: "google-drive",
      originalUrl,
      fileId,
      url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
    };
  }

  if (hostname === "dropbox.com" || hostname === "www.dropbox.com" || hostname.endsWith(".dropbox.com")) {
    const next = new URL(parsed);
    next.searchParams.set("dl", "1");
    next.searchParams.delete("raw");
    return {
      source: "dropbox",
      originalUrl,
      url: next.toString(),
    };
  }

  if (
    hostname === "1drv.ms" ||
    hostname === "onedrive.live.com" ||
    hostname.endsWith(".sharepoint.com")
  ) {
    const next = new URL(parsed);
    next.searchParams.set("download", "1");
    return {
      source: "onedrive",
      originalUrl,
      url: next.toString(),
    };
  }

  return {
    source: "direct",
    originalUrl,
    url: parsed.toString(),
  };
}

export function sanitizeProfileMediaFileName(value: string | undefined, fallbackBase = "image"): string {
  const trimmed = (value || "").trim();
  const source = trimmed || `${fallbackBase}.jpg`;
  const sanitized = source
    .replace(/[?#].*$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  if (!sanitized) return `${fallbackBase}.jpg`;
  if (sanitized.includes(".")) return sanitized;
  return `${sanitized}.jpg`;
}

export function getProfileMediaFileNameFromUrl(value: string, fallbackBase = "image"): string {
  try {
    const parsed = new URL(value);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    return sanitizeProfileMediaFileName(lastSegment, fallbackBase);
  } catch {
    return sanitizeProfileMediaFileName(undefined, fallbackBase);
  }
}

export function getExtensionForMimeType(value: string): string {
  switch (value.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export function extractFilenameFromContentDisposition(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = value.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return undefined;
}

export function resolveImportedProfileMediaFileName(args: {
  originalName?: string;
  importUrl?: string;
  contentDisposition?: string | null;
  contentType?: string | null;
  fallbackBase?: string;
}): string {
  const fromDisposition = extractFilenameFromContentDisposition(args.contentDisposition);
  const fromUrl = args.importUrl ? getProfileMediaFileNameFromUrl(args.importUrl, args.fallbackBase) : undefined;
  const preferred = sanitizeProfileMediaFileName(
    args.originalName || fromDisposition || fromUrl,
    args.fallbackBase
  );

  const hasKnownExtension = preferred.includes(".") && Boolean(inferProfileMediaMimeType(preferred));
  if (hasKnownExtension) return preferred;

  const extension = getExtensionForMimeType(args.contentType || "image/jpeg");
  const base = preferred.replace(/\.[^.]+$/, "");
  return `${base}.${extension}`;
}

export function buildProfileMediaStoragePath(args: {
  orgId: string;
  slot: ProfileMediaSlot;
  fileName?: string;
}): string {
  const fileName = sanitizeProfileMediaFileName(args.fileName, args.slot);
  const randomSuffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `organizations/${args.orgId}/profile/${args.slot}/${randomSuffix}-${fileName}`;
}

export function isPrivateIpAddress(value: string): boolean {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    const parts = value.split(".").map((segment) => Number.parseInt(segment, 10));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
      return true;
    }

    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;
    if (parts[0] >= 224) return true;
    return false;
  }

  if (!value.includes(":")) return false;

  const normalized = value.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  const compact = normalized.replace(/:/g, "");
  if (compact.length >= 2 && isHex(compact.slice(0, 2))) {
    const prefix = Number.parseInt(compact.slice(0, 2), 16);
    if ((prefix & 0xfe) === 0xfc) return true;
  }

  return false;
}

export function isBlockedRemoteHostname(value: string): boolean {
  const hostname = value.trim().toLowerCase();
  if (!hostname) return true;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  if (hostname.endsWith(".local")) return true;
  return isPrivateIpAddress(hostname);
}
