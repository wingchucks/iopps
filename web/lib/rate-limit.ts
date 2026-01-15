/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (request: Request) => string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): RateLimitResult {
  const {
    windowMs = 60000,      // Default: 1 minute
    maxRequests = 60,      // Default: 60 requests per minute
    keyGenerator = defaultKeyGenerator,
  } = config;

  const key = keyGenerator(request);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(request: Request): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback to a generic key if no IP available
  return 'unknown-ip';
}

/**
 * Create a rate limiter with custom config
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const defaultConfig: RateLimitConfig = {
    windowMs: 60000,
    maxRequests: 60,
    ...config,
  };

  return (request: Request) => checkRateLimit(request, defaultConfig);
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const rateLimiters = {
  // Standard API rate limit: 60 requests per minute
  standard: createRateLimiter({ windowMs: 60000, maxRequests: 60 }),

  // Strict rate limit for sensitive operations: 10 requests per minute
  strict: createRateLimiter({ windowMs: 60000, maxRequests: 10 }),

  // Auth rate limit: 5 attempts per 15 minutes
  auth: createRateLimiter({ windowMs: 900000, maxRequests: 5 }),

  // Admin operations: 100 requests per minute
  admin: createRateLimiter({ windowMs: 60000, maxRequests: 100 }),

  // Generous rate limit for read operations: 200 requests per minute
  generous: createRateLimiter({ windowMs: 60000, maxRequests: 200 }),

  // Contact form: 3 submissions per hour
  contact: createRateLimiter({ windowMs: 3600000, maxRequests: 3 }),

  // File upload: 10 uploads per hour
  upload: createRateLimiter({ windowMs: 3600000, maxRequests: 10 }),

  // Bulk operations: 5 requests per minute (to prevent abuse)
  bulk: createRateLimiter({ windowMs: 60000, maxRequests: 5 }),
};

/**
 * Helper to create rate limit headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}

/**
 * Middleware-style rate limit checker for API routes
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  limiter: (request: Request) => RateLimitResult = rateLimiters.standard
) {
  return async (request: Request): Promise<Response> => {
    const result = limiter(request);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(result),
          },
        }
      );
    }

    // Call the actual handler
    const response = await handler(request);

    // Add rate limit headers to response
    const headers = new Headers(response.headers);
    Object.entries(getRateLimitHeaders(result)).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
