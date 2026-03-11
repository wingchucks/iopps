const IMPORT_FETCH_TIMEOUT_MS = 15_000;

const BROKEN_DESCRIPTION_PATTERNS = [
  /join our talent community/i,
  /copyright.+adp/i,
  /\bprivacy\b[\s|]+\blegal\b/i,
  /powered by/i,
];

const MOJIBAKE_MARKERS = /(â€™|â€œ|â€|â€¢|â€“|â€”|Â\xa0|Â |â)/;

type MaybeString = string | null | undefined;

export interface ImportedJobDescriptionInput {
  description?: MaybeString;
  externalUrl?: MaybeString;
  externalId?: MaybeString;
  location?: MaybeString;
  jobType?: MaybeString;
  department?: MaybeString;
  feedUrl?: MaybeString;
}

export interface ImportedJobDescriptionPatch {
  description: string;
  descriptionFetchedAt: Date;
  descriptionSource: "adp-detail" | "oracle-meta";
  location?: string;
  jobType?: string;
  department?: string;
}

interface AdpDetailResponse {
  requisitionDescription?: string;
  workLevelCode?: { shortName?: string };
  requisitionLocations?: Array<{
    nameCode?: { shortName?: string };
  }>;
  customFieldGroup?: {
    stringFields?: Array<{
      stringValue?: string;
      nameCode?: { codeValue?: string };
    }>;
  };
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    rsquo: "'",
    lsquo: "'",
    ldquo: "\"",
    rdquo: "\"",
    mdash: "—",
    ndash: "–",
    bull: "•",
    hellip: "…",
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _match;
    }
    if (lower.startsWith("#")) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _match;
    }
    return named[lower] ?? _match;
  });
}

function repairMojibake(value: string): string {
  if (!MOJIBAKE_MARKERS.test(value)) return value;

  const repaired = Buffer.from(value, "latin1").toString("utf8");
  const repairedScore = (repaired.match(/(â€™|â€œ|â€|â€¢|â€“|â€”|Â |â)/g) || []).length;
  const originalScore = (value.match(/(â€™|â€œ|â€|â€¢|â€“|â€”|Â |â)/g) || []).length;

  return repairedScore < originalScore ? repaired : value;
}

export function normalizeImportedDescription(value: MaybeString): string {
  if (!value) return "";
  return normalizeWhitespace(repairMojibake(decodeHtmlEntities(value)));
}

function htmlToText(html: string): string {
  return normalizeImportedDescription(
    html
      .replace(/<link\b[^>]*>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|h1|h2|h3|h4|h5|h6|ul|ol)>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "• ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  );
}

function looksLikeBrokenImportedDescription(value: string): boolean {
  const normalized = normalizeImportedDescription(value);
  if (!normalized) return true;
  return BROKEN_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function shouldHydrateImportedDescription(input: ImportedJobDescriptionInput): boolean {
  const externalUrl = `${input.externalUrl || ""}`.trim();
  if (!externalUrl) return false;
  return looksLikeBrokenImportedDescription(input.description || "");
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMPORT_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "IOPPS-JobDescription/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractAdpDepartment(payload: AdpDetailResponse): string | undefined {
  const field = payload.customFieldGroup?.stringFields?.find(
    (entry) => entry.nameCode?.codeValue?.toLowerCase() === "jobclass"
  );
  return normalizeImportedDescription(field?.stringValue);
}

function extractCidFromUrl(value: MaybeString): string {
  if (!value) return "";
  try {
    return new URL(value).searchParams.get("cid") || "";
  } catch {
    return "";
  }
}

function resolveAdpCid(externalUrl: string, feedUrl?: MaybeString): string {
  const urlCid = extractCidFromUrl(externalUrl);
  const feedCid = extractCidFromUrl(feedUrl);

  if (feedCid && (!urlCid || /^\d+$/.test(urlCid))) {
    return feedCid;
  }

  return urlCid || feedCid;
}

async function fetchAdpDescription(
  externalUrl: string,
  feedUrl?: MaybeString
): Promise<ImportedJobDescriptionPatch | null> {
  const parsedUrl = new URL(externalUrl);
  const cid = resolveAdpCid(externalUrl, feedUrl);
  const jobId = parsedUrl.searchParams.get("jobId");
  const lang = parsedUrl.searchParams.get("lang") || "en_CA";
  const locale = parsedUrl.searchParams.get("locale") || lang;

  if (!cid || !jobId) return null;

  const detailUrl = new URL(
    `https://workforcenow.adp.com/mascsr/default/careercenter/public/events/staffing/v1/job-requisitions/${encodeURIComponent(jobId)}`
  );
  detailUrl.searchParams.set("cid", cid);
  detailUrl.searchParams.set("lang", lang);
  detailUrl.searchParams.set("locale", locale);

  const responseText = await fetchText(detailUrl.toString());
  const payload = JSON.parse(responseText) as AdpDetailResponse;
  const description = htmlToText(payload.requisitionDescription || "");

  if (!description || looksLikeBrokenImportedDescription(description)) {
    return null;
  }

  const location = normalizeImportedDescription(payload.requisitionLocations?.[0]?.nameCode?.shortName);
  const jobType = normalizeImportedDescription(payload.workLevelCode?.shortName);
  const department = extractAdpDepartment(payload);

  return {
    description,
    descriptionFetchedAt: new Date(),
    descriptionSource: "adp-detail",
    ...(location ? { location } : {}),
    ...(jobType ? { jobType } : {}),
    ...(department ? { department } : {}),
  };
}

function extractMetaContent(html: string, property: string): string {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const metaRegex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapedProperty}["'][^>]+content=["']([\\s\\S]*?)["'][^>]*>`,
    "i"
  );
  const match = html.match(metaRegex);
  return normalizeImportedDescription(match?.[1] || "");
}

async function fetchOracleDescription(externalUrl: string): Promise<ImportedJobDescriptionPatch | null> {
  const html = await fetchText(externalUrl);
  const description = extractMetaContent(html, "og:description");

  if (!description || looksLikeBrokenImportedDescription(description)) {
    return null;
  }

  return {
    description,
    descriptionFetchedAt: new Date(),
    descriptionSource: "oracle-meta",
  };
}

export async function fetchImportedDescriptionPatch(
  input: ImportedJobDescriptionInput
): Promise<ImportedJobDescriptionPatch | null> {
  const externalUrl = `${input.externalUrl || ""}`.trim();
  if (!externalUrl || !shouldHydrateImportedDescription(input)) return null;

  try {
    const parsed = new URL(externalUrl);
    if (parsed.hostname.includes("workforcenow.adp.com")) {
      return await fetchAdpDescription(externalUrl, input.feedUrl);
    }
    if (parsed.hostname.includes("oraclecloud.com")) {
      return await fetchOracleDescription(externalUrl);
    }
  } catch (error) {
    console.error("[imported-job-descriptions] Failed to hydrate description", {
      externalUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return null;
}
