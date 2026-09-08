export type FeedItem = Record<string, string>;
type Json = Record<string, unknown>;
type Fetcher = typeof fetch;
const record = (v: unknown): Json => v && typeof v === "object" && !Array.isArray(v) ? v as Json : {};
const text = (v: unknown) => typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";

async function request(url: string, fetcher: Fetcher, init: RequestInit = {}): Promise<Response> {
  const response = await fetcher(url, { ...init, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!response.ok) throw new Error(`Feed source returned HTTP ${response.status}`);
  return response;
}

export function dayforceContext(html: string, feedUrl: string) {
  const url = new URL(feedUrl);
  if (url.protocol !== "https:" || url.hostname !== "jobs.dayforcehcm.com") throw new Error("Unsupported Dayforce board URL");
  const match = html.match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error("Dayforce board metadata is missing");
  const root = record(JSON.parse(match[1]));
  const props = record(record(root.props).pageProps);
  const queries = record(props.dehydratedState).queries;
  const query = Array.isArray(queries) ? queries.map(record).find(q => Array.isArray(q.queryKey) && q.queryKey[0] === "site-info") : undefined;
  const site = record(record(query?.state).data);
  const namespace = text(site.clientNamespace);
  const board = text(site.jobBoardCode);
  const culture = text(site.cultureCode);
  if (!namespace || !board || !culture || !url.pathname.toLowerCase().replace(/\/$/, "").endsWith(`/${namespace.toLowerCase()}/${board.toLowerCase()}`)) throw new Error("Dayforce board metadata does not match the configured employer");
  if (site.isDisabled === true) throw new Error("Dayforce board is disabled");
  return { origin: url.origin, namespace, board, culture };
}

export function parseDayforcePage(value: unknown, context: ReturnType<typeof dayforceContext>, expectedOffset: number) {
  const data = record(value);
  if (!Array.isArray(data.jobPostings) || !Number.isInteger(data.maxCount) || Number(data.maxCount) < 0 || data.offset !== expectedOffset) throw new Error("Invalid or repeated Dayforce results page");
  const items = data.jobPostings.map((value): FeedItem => {
    const job = record(value);
    const id = text(job.jobPostingId);
    if (!/^\d+$/.test(id) || !text(job.jobTitle) || job.clientNamespace !== context.namespace) throw new Error("Invalid Dayforce job identity");
    const locations = Array.isArray(job.postingLocations) ? job.postingLocations.map(record).map(l => [text(l.cityName), text(l.stateCode), text(l.isoCountryCode)].filter(Boolean).join(", ")).filter(Boolean) : [];
    return {
      guid: id,
      title: text(job.jobTitle),
      description: text(job.jobDescription),
      location: locations.join("; ") || "Canada",
      pubDate: text(job.postingStartTimestampUTC),
      link: `${context.origin}/${encodeURIComponent(context.culture)}/${encodeURIComponent(context.namespace)}/${encodeURIComponent(context.board.toUpperCase())}/jobs/${id}`,
    };
  });
  return { items, total: Number(data.maxCount) };
}

/** Uses the public board's own CSRF session contract; no account or application is created. */
export async function fetchDayforceItems(feedUrl: string, fetcher: Fetcher = fetch): Promise<FeedItem[]> {
  const landing = await request(feedUrl, fetcher);
  const context = dayforceContext(await landing.text(), feedUrl);
  const csrf = await request(`${context.origin}/api/auth/csrf`, fetcher);
  const csrfToken = text(record(await csrf.json()).csrfToken);
  if (!csrfToken) throw new Error("Dayforce source session could not be initialized");
  const cookies = new Map<string, string>();
  for (const header of [...landing.headers.getSetCookie(), ...csrf.headers.getSetCookie()]) {
    const pair = header.split(";", 1)[0];
    cookies.set(pair.split("=", 1)[0], pair);
  }
  const jobs = new Map<string, FeedItem>();
  let expectedTotal: number | undefined;
  // The public board occasionally changes ordering between pages without changing
  // its count. Retry complete traversals, retaining unique jobs, but never import
  // an incomplete result or more jobs than the board advertises.
  for (let pass = 0; pass < 3; pass++) {
    let offset = 0;
    for (let page = 0; page < 100; page++) {
      const response = await request(`${context.origin}/api/geo/${encodeURIComponent(context.namespace)}/jobposting/search`, fetcher, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrfToken, Cookie: [...cookies.values()].join("; ") },
        body: JSON.stringify({ clientNamespace: context.namespace, jobBoardCode: context.board, cultureCode: context.culture, paginationStart: offset }),
      });
      const result = parseDayforcePage(await response.json(), context, offset);
      if (expectedTotal !== undefined && result.total !== expectedTotal) throw new Error("Dayforce source changed during pagination; retry sync");
      expectedTotal = result.total;
      for (const item of result.items) jobs.set(item.guid, item);
      offset += result.items.length;
      if (offset > result.total || jobs.size > result.total) throw new Error("Inconsistent Dayforce source results");
      if (offset === result.total) {
        if (jobs.size === result.total) return [...jobs.values()];
        break;
      }
      if (!result.items.length) throw new Error("Incomplete Dayforce source results");
      if (page === 99) throw new Error("Dayforce pagination limit exceeded");
    }
  }
  throw new Error("Dayforce source repeated or omitted jobs after three complete passes; sync stopped");
}

export async function fetchOracleItems(feedUrl: string, fetcher: Fetcher = fetch): Promise<FeedItem[]> {
  const url = new URL(feedUrl);
  const finder = url.searchParams.get("finder");
  if (!finder?.startsWith("findReqs;")) throw new Error("Unsupported Oracle requisition finder");
  const items: FeedItem[] = [];
  const ids = new Set<string>();
  let expectedTotal: number | undefined;
  for (let page = 0; page < 100; page++) {
    // Oracle's outer REST limit does not paginate the nested requisitionList.
    const base = finder.replace(/(?:,|;)(?:offset|limit)=[^,;]*/gi, "");
    url.searchParams.set("finder", `${base},offset=${items.length},limit=25`);
    const response = await request(url.href, fetcher);
    const json = record(await response.json());
    const result = record(Array.isArray(json.items) ? json.items[0] : null);
    if (!Array.isArray(result.requisitionList) || !Number.isInteger(result.TotalJobsCount) || Number(result.TotalJobsCount) < 0 || result.Offset !== items.length) throw new Error("Invalid or repeated Oracle requisition page");
    if (expectedTotal !== undefined && result.TotalJobsCount !== expectedTotal) throw new Error("Oracle source changed during pagination; retry sync");
    expectedTotal = Number(result.TotalJobsCount);
    for (const value of result.requisitionList) {
      const job = record(value);
      const id = text(job.Id);
      if (!id || !text(job.Title) || ids.has(id)) throw new Error("Invalid or repeated Oracle job identity");
      ids.add(id);
      items.push({ guid: id, title: text(job.Title), description: text(job.ShortDescriptionStr), pubDate: text(job.PostedDate), location: text(job.PrimaryLocation) || "Canada", link: `${url.origin}/hcmUI/CandidateExperience/en/sites/${encodeURIComponent(text(result.SiteNumber) || "SIGA")}/job/${encodeURIComponent(id)}` });
    }
    if (items.length === result.TotalJobsCount) return items;
    if (!result.requisitionList.length || items.length > Number(result.TotalJobsCount)) throw new Error("Incomplete Oracle source results");
  }
  throw new Error("Oracle pagination limit exceeded");
}

/** Match historical Dayforce /apply links to current detail URLs without matching different employers. */
export function feedJobKey(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    const dayforce = url.hostname === "jobs.dayforcehcm.com" && url.pathname.match(/\/(?:[a-z]{2}-[a-z]{2}\/)?([^/]+)\/([^/]+)\/jobs\/(\d+)(?:\/apply)?\/?$/i);
    if (dayforce) return `dayforce:${dayforce[1].toLowerCase()}:${dayforce[2].toLowerCase()}:${dayforce[3]}`;
    return `${url.origin}${url.pathname.replace(/\/$/, "")}${url.search}`;
  } catch { return ""; }
}

export async function loadFeedItems(feedUrl: string, feedType = "xml", fetcher: Fetcher = fetch): Promise<FeedItem[]> {
  if (feedType === "dayforce") return fetchDayforceItems(feedUrl, fetcher);
  if (feedType === "oracle-hcm") return fetchOracleItems(feedUrl, fetcher);
  if (!["xml", "rss", "adp"].includes(feedType)) throw new Error(`Unsupported feed type: ${feedType}`);
  const response = await request(feedUrl, fetcher);
  const body = await response.text();
  return feedType === "adp" ? parseAdp(body, feedUrl) : parseSimpleXml(body);
}

export function parseSimpleXml(xml: string): Array<Record<string, string>> {
  if (!/<(?:rss|jobs)(?:\s|>)/i.test(xml) || /<(?:html|!doctype html)(?:\s|>)/i.test(xml)) throw new Error("Expected an XML job feed, received an unsupported document");
  const items: Array<Record<string, string>> = [];
  const itemRegex = /<(?:item|job)>([\s\S]*?)<\/(?:item|job)>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item: Record<string, string> = {};
    const content = match[1];
    const fieldRegex = /<(\w+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRegex.exec(content)) !== null) {
      item[fieldMatch[1].toLowerCase()] = fieldMatch[2]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim();
    }

    // Normalize SmartJobBoard field names to RSS standard
    if (!item.link && item.url) item.link = item.url;
    if (!item.guid && item.referencenumber) item.guid = item.referencenumber;
    if (item.pubdate || item.date) item.pubDate = item.pubdate || item.date;
    if (!item.location && (item.city || item.state)) {
      item.location = [item.city, item.state, item.country]
        .filter(Boolean)
        .join(", ");
    }

    items.push(item);
  }

  return items;
}

export function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

// ---------------------------------------------------------------------------
// Oracle HCM parser — handles recruitingCEJobRequisitions JSON response
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ADP Workforce Now parser
// ---------------------------------------------------------------------------

export function parseAdp(text: string, feedUrl?: string): Array<Record<string, string>> {
  try {
    const json = JSON.parse(text);
    if (!Array.isArray(json.jobRequisitions)) throw new Error("Invalid ADP feed response");
    const requisitions = json.jobRequisitions;
    const feedCid = (() => {
      if (!feedUrl) return "";
      try {
        return new URL(feedUrl).searchParams.get("cid") || "";
      } catch {
        return "";
      }
    })();
    return requisitions.map((req: Record<string, unknown>) => {
      const itemID = String(req.itemID || "");
      const cid = feedCid || String((req as Record<string, unknown>).cid || "");
      return {
        title: String(req.requisitionTitle || ""),
        guid: itemID,
        link: cid
          ? `https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=${cid}&jobId=${itemID}&lang=en_CA&source=CC2`
          : "",
        pubDate: String((req.postDate as string)?.substring(0, 10) || ""),
        description: String(req.requisitionDescription || req.shortDescription || ""),
        location: String(req.location || req.primaryLocation || "Canada"),
      };
    });
  } catch {
    throw new Error("Unable to parse ADP job feed");
  }
}

