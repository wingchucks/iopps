import { isIpLiteral, isPublicIpAddress } from "@/lib/public-ip";

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

  if (parsed.username || parsed.password || (parsed.port && parsed.port !== "443")) {
    throw new Error("Image links must use port 443 without URL credentials");
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

// Compatibility name: all special-use/nonpublic literals are blocked.
export function isPrivateIpAddress(value: string): boolean {
  return isIpLiteral(value) && !isPublicIpAddress(value);
}

export function isBlockedRemoteHostname(value: string): boolean {
  const hostname = value.trim().toLowerCase().replace(/\.$/, "");
  if (!hostname) return true;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  if (hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".home.arpa")) return true;
  if (!hostname.includes(".") && !hostname.includes(":")) return true;
  return isPrivateIpAddress(hostname);
}
