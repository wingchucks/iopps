/**
 * URL Validation utilities for preventing SSRF attacks
 */

// Private IP ranges that should be blocked
const PRIVATE_IP_RANGES = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local
  /^0\./, // Current network
  /^224\./, // Multicast
  /^240\./, // Reserved
  /^255\./, // Broadcast
  /^localhost$/i,
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 private
  /^fe80:/i, // IPv6 link-local
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal", // GCP metadata
  "169.254.169.254", // AWS/GCP/Azure metadata
  "metadata.google.com",
  "kubernetes.default",
];

/**
 * Check if a hostname resolves to a private/internal IP
 */
function isPrivateHost(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(lowerHostname)) {
    return true;
  }

  // Check if it matches private IP patterns
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(hostname)) {
      return true;
    }
  }

  // Check for internal domain patterns
  if (
    lowerHostname.endsWith(".local") ||
    lowerHostname.endsWith(".internal") ||
    lowerHostname.endsWith(".localhost") ||
    lowerHostname.endsWith(".corp") ||
    lowerHostname.endsWith(".lan")
  ) {
    return true;
  }

  return false;
}

/**
 * Validate a URL for safe external fetching (SSRF protection)
 * @param url The URL to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateExternalUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        isValid: false,
        error: `Invalid protocol: ${parsed.protocol}. Only HTTP and HTTPS are allowed.`,
      };
    }

    // Check for private/internal hosts
    if (isPrivateHost(parsed.hostname)) {
      return {
        isValid: false,
        error: `Blocked hostname: ${parsed.hostname}. Internal/private addresses are not allowed.`,
      };
    }

    // Check for IP address in hostname and validate it's not private
    const ipMatch = parsed.hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    if (ipMatch) {
      for (const pattern of PRIVATE_IP_RANGES) {
        if (pattern.test(parsed.hostname)) {
          return {
            isValid: false,
            error: `Blocked IP address: ${parsed.hostname}. Private IP ranges are not allowed.`,
          };
        }
      }
    }

    // Prevent port scanning by blocking unusual ports
    const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === "https:" ? 443 : 80);
    const allowedPorts = [80, 443, 8080, 8443];
    if (!allowedPorts.includes(port)) {
      return {
        isValid: false,
        error: `Blocked port: ${port}. Only standard web ports are allowed.`,
      };
    }

    // Check for username/password in URL (can be used for attacks)
    if (parsed.username || parsed.password) {
      return {
        isValid: false,
        error: "URLs with embedded credentials are not allowed.",
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: "Invalid URL format.",
    };
  }
}

/**
 * Sanitize a URL by removing potentially dangerous components
 */
export function sanitizeUrl(url: string): string | null {
  const validation = validateExternalUrl(url);
  if (!validation.isValid) {
    return null;
  }

  try {
    const parsed = new URL(url);
    // Reconstruct URL without auth info
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}
