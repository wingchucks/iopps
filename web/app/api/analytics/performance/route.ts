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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

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
