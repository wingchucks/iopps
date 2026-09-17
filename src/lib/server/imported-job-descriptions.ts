import { Parser } from "htmlparser2";
import { descriptionText } from "@/lib/description-text";
import { OutboundFetchError, safeOutboundFetch } from "@/lib/server/safe-outbound-fetch";

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
  description?: string;
  descriptionFormat: "plain-text";
  descriptionFetchedAt: Date;
  descriptionSource: "adp-detail" | "oracle-meta" | "adp-closed";
  location?: string;
  jobType?: string;
  department?: string;
  active?: boolean;
  status?: string;
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

function repairMojibake(value: string): string {
  if (!MOJIBAKE_MARKERS.test(value)) return value;

  const repaired = Buffer.from(value, "latin1").toString("utf8");
  const repairedScore = (repaired.match(/(â€™|â€œ|â€|â€¢|â€“|â€”|Â |â)/g) || []).length;
  const originalScore = (value.match(/(â€™|â€œ|â€|â€¢|â€“|â€”|Â |â)/g) || []).length;

  return repairedScore < originalScore ? repaired : value;
}

export function normalizeImportedDescription(value: MaybeString, format?: unknown): string {
  if (!value) return "";
  return descriptionText(repairMojibake(value), format);
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
  const origin = new URL(url).origin;
  const response = await safeOutboundFetch(url, {
    maxBytes: 2 * 1024 * 1024,
    timeoutMs: IMPORT_FETCH_TIMEOUT_MS,
    accept: "application/json, text/html, text/plain",
    validateUrl: (next) => {
      if (next.origin !== origin) throw new OutboundFetchError("Provider redirect changed origin");
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.body.toString("utf8");
}

function isHttpsOrigin(url: URL): boolean {
  return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443");
}

/** Supported Oracle HCM tenants are bound to the configured feed's exact origin.
 * A remote job URL cannot nominate a different tenant or a lookalike hostname.
 */
function isSupportedOracleJob(url: URL, feedUrl: MaybeString): boolean {
  if (!feedUrl || !isHttpsOrigin(url)) return false;
  const feed = new URL(feedUrl);
  const labels = url.hostname.split(".");
  return isHttpsOrigin(feed) && feed.origin === url.origin &&
    labels.length === 5 && Boolean(labels[0]) && labels[1] === "fa" && Boolean(labels[2]) &&
    labels[3] === "oraclecloud" && labels[4] === "com" &&
    url.pathname.startsWith("/hcmUI/CandidateExperience/") &&
    feed.pathname.startsWith("/hcmRestApi/") && feed.pathname.endsWith("/recruitingCEJobRequisitions");
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
  const hasVisiblePosting = Boolean(
    normalizeImportedDescription((payload as Record<string, unknown>).requisitionTitle as string | undefined)
    || payload.requisitionDescription
  );

  if (!hasVisiblePosting) {
    return {
      description: "",
      descriptionFormat: "plain-text",
      descriptionFetchedAt: new Date(),
      descriptionSource: "adp-closed",
      active: false,
      status: "expired",
    };
  }

  const description = normalizeImportedDescription(payload.requisitionDescription || "");

  if (!description || looksLikeBrokenImportedDescription(description)) {
    return null;
  }

  const location = normalizeImportedDescription(payload.requisitionLocations?.[0]?.nameCode?.shortName);
  const jobType = normalizeImportedDescription(payload.workLevelCode?.shortName);
  const department = extractAdpDepartment(payload);

  return {
    description,
    descriptionFormat: "plain-text",
    descriptionFetchedAt: new Date(),
    descriptionSource: "adp-detail",
    ...(location ? { location } : {}),
    ...(jobType ? { jobType } : {}),
    ...(department ? { department } : {}),
  };
}

function extractMetaContent(html: string, property: string): string {
  let content = "";
  const parser = new Parser({
    onopentag(name, attributes) {
      if (!content && name === "meta" && (attributes.property || attributes.name) === property) {
        // Attribute entities have already been decoded by the parser. Treat the
        // result as text; never parse decoded markup a second time.
        content = normalizeImportedDescription(attributes.content || "", "plain-text");
      }
    },
  }, { decodeEntities: true });
  parser.end(html);
  return content;
}

async function fetchOracleDescription(externalUrl: string): Promise<ImportedJobDescriptionPatch | null> {
  const html = await fetchText(externalUrl);
  const description = extractMetaContent(html, "og:description");

  if (!description || looksLikeBrokenImportedDescription(description)) {
    return null;
  }

  return {
    description,
    descriptionFormat: "plain-text",
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
    if (isHttpsOrigin(parsed) && parsed.hostname === "workforcenow.adp.com") {
      return await fetchAdpDescription(externalUrl, input.feedUrl);
    }
    if (isSupportedOracleJob(parsed, input.feedUrl)) {
      return await fetchOracleDescription(externalUrl);
    }
  } catch (error) {
    console.error("[imported-job-descriptions] Failed to hydrate description", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return null;
}
