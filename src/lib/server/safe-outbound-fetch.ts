import { lookup } from "node:dns";
import { X509Certificate } from "node:crypto";
import { request } from "node:https";
import { isIP } from "node:net";
import { checkServerIdentity } from "node:tls";
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

/** Resolve once, then connect only to the validated numeric address. Node's
 * lookup handles IP literals locally; net/tls never resolves the hostname again.
 */
function resolvePublicAddress(url: URL, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new OutboundFetchError("Outbound request timed out"));
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    try {
      lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted) return;
        if (error) return reject(error);
        if (!addresses.length || addresses.some(({ address }) => !isIP(address) || !isPublicIpAddress(address))) {
          return reject(new OutboundFetchError("DNS returned a nonpublic destination"));
        }
        resolve(addresses[0].address);
      });
    } catch (error) {
      signal.removeEventListener("abort", abort);
      reject(error);
    }
  });
}

function requestOnce(url: URL, address: string, options: OutboundOptions, signal: AbortSignal, authorization?: string): Promise<OutboundResponse> {
  return new Promise((resolve, reject) => {
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const req = request({
      protocol: "https:",
      hostname: address, // Numeric and validated: no second DNS resolution or rebinding.
      port: 443,
      path: url.pathname + url.search,
      servername: isIP(hostname) ? undefined : hostname,
      method: "GET",
      agent: false, // No pooled connection or environment proxy bypasses the pinned address.
      rejectUnauthorized: true, // Native TLS still verifies the certificate chain before identity.
      checkServerIdentity: (servername, certificate) => {
        if (!isIP(hostname)) return checkServerIdentity(servername, certificate);
        // Node 24.19's default identity check applies domainToASCII to IPs,
        // which rejects IPv6 literals. Use Node/OpenSSL's native IP SAN check;
        // never treat a DNS SAN or CN as authorization for an IP destination.
        try {
          if (new X509Certificate(certificate.raw).checkIP(hostname)) return undefined;
        } catch { /* An unreadable certificate must fail closed. */ }
        return new OutboundFetchError("TLS certificate does not match IP destination");
      },
      signal,
      maxHeaderSize: 16 * 1024,
      headers: {
        Host: url.host,
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
      const address = await resolvePublicAddress(url, controller.signal);
      controller.signal.throwIfAborted();
      const response = await requestOnce(url, address, options, controller.signal, authorization);
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
