import ipaddr from "ipaddr.js";

/** Fail closed on special-use addresses, including IPv4 embedded in IPv6. */
export function isPublicIpAddress(value: string): boolean {
  const address = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  if (address.includes("%") || !ipaddr.isValid(address)) return false;
  const parsed = ipaddr.process(address);
  if (parsed.range() !== "unicast") return false;
  // Only currently allocated global IPv6 unicast space; exclude future and
  // translation ranges even if the library calls them ordinary unicast.
  return parsed.kind() === "ipv4" || parsed.match(ipaddr.parseCIDR("2000::/3"));
}

export function isIpLiteral(value: string): boolean {
  const address = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  return ipaddr.isValid(address);
}

/**
 * The visitor address as set by the hosting edge (Vercel overwrites x-real-ip
 * and x-forwarded-for, unlike arbitrary client headers); null when absent or
 * not an IP literal. IPv4-mapped IPv6 is reduced to IPv4; IPv6 is returned in
 * full eight-group form so prefixes can be compared.
 */
export function requestClientIp(headers: Headers): string | null {
  const value = (headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
  const address = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  if (!address || address.includes("%") || !ipaddr.isValid(address)) return null;
  const parsed = ipaddr.process(address);
  return parsed.kind() === "ipv6" ? parsed.toNormalizedString() : parsed.toString();
}
