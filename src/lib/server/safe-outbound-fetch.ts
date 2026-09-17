import { lookup } from "node:dns";
import { request } from "node:https";
import type { LookupFunction } from "node:net";
import { isBlockedRemoteHostname } from "@/lib/profile-media";
import { isPublicIpAddress } from "@/lib/public-ip";

export class OutboundFetchError extends Error {}

interface OutboundOptions {
  maxBytes: number;
  timeoutMs?: number;
  maxRedirects?: number;
  authorization?: string;
  accept?: string;
  /** Provider-specific origin policy, applied before DNS on every hop. */
  validateUrl?: (url: URL) => void;
}

interface OutboundResponse {
  status: number;
  ok: boolean;
  url: string;
  headers: Headers;
  body: Buffer;
}

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

function validateDestination(value: string, policy?: OutboundOptions["validateUrl"]): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password) {
    throw new OutboundFetchError("Only HTTPS URLs on port 443 without credentials are supported");
  }
  if (isBlockedRemoteHostname(url.hostname)) {
    throw new OutboundFetchError("Private or local network destinations are not allowed");
  }
  policy?.(url);
  return url;
}

/** The returned, validated address is the address net/tls actually connects to.
 * There is no preflight DNS lookup followed by a second transport resolution.
 */
function transportLookup(signal: AbortSignal): LookupFunction {
  return (hostname, options, callback) => {
    lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (signal.aborted) return callback(new OutboundFetchError("Outbound request timed out"), "", 0);
      if (error) return callback(error, "", 0);
      if (!addresses.length || addresses.some(({ address }) => !isPublicIpAddress(address))) {
        return callback(new OutboundFetchError("DNS returned a nonpublic destination"), "", 0);
      }
      // Pin one answer, including when Node requests all addresses for family
      // selection. A retry/redirect must pass through this boundary again.
      const selected = addresses[0];
      if (options.all) callback(null, [selected]);
      else callback(null, selected.address, selected.family);
    });
  };
}

function requestOnce(url: URL, options: OutboundOptions, signal: AbortSignal, authorization?: string): Promise<OutboundResponse> {
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: "GET",
      agent: false, // No pooled connection or environment proxy bypasses lookup.
      lookup: transportLookup(signal),
      rejectUnauthorized: true, // Keep the URL hostname for SNI and certificate verification.
      signal,
      maxHeaderSize: 16 * 1024,
      headers: {
        Accept: options.accept || "*/*",
        "Accept-Encoding": "identity",
        "User-Agent": "IOPPS-Import/1.0",
        ...(authorization ? { Authorization: authorization } : {}),
      },
    }, (res) => {
      const headers = new Headers();
      for (const [key, value] of Object.entries(res.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
      const status = res.statusCode || 0;
      const result = { status, ok: status >= 200 && status < 300, url: url.href, headers };
      res.on("error", reject);
      // Never consume an unbounded error/redirect body.
      if (REDIRECTS.has(status) || !result.ok) {
        res.destroy();
        resolve({ ...result, body: Buffer.alloc(0) });
        return;
      }
      const encoding = headers.get("content-encoding");
      const length = headers.get("content-length");
      if ((encoding && encoding.toLowerCase() !== "identity") || (length && Number(length) > options.maxBytes)) {
        const error = new OutboundFetchError("Unsupported encoding or response exceeds size limit");
        res.destroy(error);
        reject(error);
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > options.maxBytes) {
          const error = new OutboundFetchError("Response exceeds size limit");
          res.destroy(error);
          reject(error);
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => resolve({ ...result, body: Buffer.concat(chunks, size) }));
      res.on("aborted", () => reject(new OutboundFetchError("Incomplete outbound response")));
    });
    req.on("error", reject);
    req.end();
  });
}

/** Bounded HTTPS GET for untrusted imports. No caller-supplied transport options. */
export async function safeOutboundFetch(value: string, options: OutboundOptions): Promise<OutboundResponse> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxRedirects = options.maxRedirects ?? 3;
  if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes <= 0 || options.maxBytes > 5 * 1024 * 1024 ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30_000 ||
      !Number.isSafeInteger(maxRedirects) || maxRedirects < 0 || maxRedirects > 5) {
    throw new OutboundFetchError("Invalid outbound request limits");
  }
  const controller = new AbortController();
  // A single wall-clock deadline covers DNS, connect, TLS, redirects and body.
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let authorization = options.authorization;
  try {
    let url = validateDestination(value, options.validateUrl);
    for (let hop = 0; ; hop++) {
      controller.signal.throwIfAborted();
      const response = await requestOnce(url, options, controller.signal, authorization);
      if (!REDIRECTS.has(response.status)) return response;
      if (hop >= maxRedirects) throw new OutboundFetchError("Too many redirects");
      const location = response.headers.get("location");
      if (!location) throw new OutboundFetchError("Redirect is missing its destination");
      const next = validateDestination(new URL(location, url).href, options.validateUrl);
      // Credentials may survive same-origin hops only. Never restore them if a
      // cross-origin redirect later returns to the original host.
      if (next.origin !== url.origin) authorization = undefined;
      url = next;
    }
  } catch (error) {
    if (controller.signal.aborted) throw new OutboundFetchError("Outbound request timed out");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
