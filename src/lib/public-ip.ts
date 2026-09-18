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
