import { NextRequest, NextResponse } from "next/server";

/**
 * Performance Analytics Endpoint
 * Receives Core Web Vitals and custom performance metrics from the client
 *
 * In a production environment, you would:
 * 1. Store these metrics in a database (e.g., Firestore, BigQuery)
 * 2. Send them to an analytics service (e.g., Google Analytics, Datadog)
 * 3. Create dashboards to monitor performance over time
 *
 * For now, this endpoint just accepts the data to prevent 405 errors.
 */

// Simple rate limiting by IP (in-memory, resets on restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // Max requests per minute per IP
const RATE_WINDOW_MS = 60 * 1000;

export async function POST(request: NextRequest) {
    try {
        // Rate limiting by IP to prevent abuse
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
                   request.headers.get("x-real-ip") ||
                   "unknown";
        const now = Date.now();
        const rateLimit = rateLimitMap.get(ip);

        if (rateLimit && now < rateLimit.resetTime) {
            if (rateLimit.count >= RATE_LIMIT) {
                return NextResponse.json({ error: "Rate limited" }, { status: 429 });
            }
            rateLimit.count++;
        } else {
            rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
        }

        // Limit body size to prevent abuse
        const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
        if (contentLength > 10000) { // 10KB max
            return NextResponse.json({ error: "Payload too large" }, { status: 413 });
        }

        const body = await request.json();

        // Basic validation - ensure it looks like a metrics payload
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: true }); // Silently accept
        }

        // In production, you would store/forward these metrics
        // For now, just log in development
        if (process.env.NODE_ENV === "development") {
            console.log("[Performance Metric]", body);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        // Silently accept malformed requests to avoid client errors
        return NextResponse.json({ success: true });
    }
}

// Also handle GET requests gracefully (in case of misconfigured sendBeacon)
export async function GET() {
    return NextResponse.json({
        message: "Performance analytics endpoint - use POST to submit metrics"
    });
}
