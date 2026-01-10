import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import type { ApplicationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ApplicationDoc {
  id: string;
  status: ApplicationStatus;
  createdAt: { _seconds: number } | null;
  updatedAt: { _seconds: number } | null;
  jobId: string;
}

interface AnalyticsResponse {
  // Summary metrics
  totalApplications: number;
  newThisWeek: number;
  newThisMonth: number;

  // Status breakdown
  statusCounts: Record<ApplicationStatus, number>;

  // Timeline data (last 30 days)
  timeline: { date: string; count: number }[];

  // Conversion funnel
  funnel: {
    submitted: number;
    reviewed: number;
    shortlisted: number;
    hired: number;
    rejected: number;
    withdrawn: number;
  };

  // Response metrics
  avgResponseTime: number | null; // in hours
  responseRate: number; // percentage of applications reviewed
  hireRate: number; // percentage of applications that led to hire
}

export async function GET(request: NextRequest) {
  try {
    // Verify server configuration
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    // Verify auth token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const employerId = decodedToken.uid;

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId"); // Optional: filter by specific job
    const days = parseInt(searchParams.get("days") || "30", 10); // Default 30 days

    // Build query
    let query = db
      .collection("applications")
      .where("employerId", "==", employerId);

    if (jobId) {
      query = query.where("jobId", "==", jobId);
    }

    const snapshot = await query.get();
    const applications: ApplicationDoc[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ApplicationDoc));

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Calculate metrics
    const totalApplications = applications.length;

    // Status counts
    const statusCounts: Record<ApplicationStatus, number> = {
      submitted: 0,
      reviewed: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0,
      withdrawn: 0,
    };

    let newThisWeek = 0;
    let newThisMonth = 0;
    let totalResponseTime = 0;
    let reviewedCount = 0;

    // Timeline data - initialize with zeros for last N days
    const timelineMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      timelineMap.set(dateKey, 0);
    }

    applications.forEach(app => {
      // Count by status
      if (app.status && statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      }

      // Get creation date
      const createdAt = app.createdAt?._seconds
        ? new Date(app.createdAt._seconds * 1000)
        : null;

      if (createdAt) {
        // Count new applications
        if (createdAt >= weekAgo) newThisWeek++;
        if (createdAt >= monthAgo) newThisMonth++;

        // Add to timeline
        const dateKey = createdAt.toISOString().split("T")[0];
        if (timelineMap.has(dateKey)) {
          timelineMap.set(dateKey, (timelineMap.get(dateKey) || 0) + 1);
        }

        // Calculate response time for reviewed applications
        if (app.status !== "submitted" && app.status !== "withdrawn") {
          const updatedAt = app.updatedAt?._seconds
            ? new Date(app.updatedAt._seconds * 1000)
            : null;

          if (updatedAt && updatedAt > createdAt) {
            const responseTimeHours = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            totalResponseTime += responseTimeHours;
            reviewedCount++;
          }
        }
      }
    });

    // Convert timeline map to sorted array
    const timeline = Array.from(timelineMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate funnel and rates
    const funnel = {
      submitted: statusCounts.submitted,
      reviewed: statusCounts.reviewed,
      shortlisted: statusCounts.shortlisted,
      hired: statusCounts.hired,
      rejected: statusCounts.rejected,
      withdrawn: statusCounts.withdrawn,
    };

    const processedCount = totalApplications - statusCounts.submitted - statusCounts.withdrawn;
    const responseRate = totalApplications > 0
      ? Math.round((processedCount / totalApplications) * 100)
      : 0;

    const hireRate = totalApplications > 0
      ? Math.round((statusCounts.hired / totalApplications) * 100)
      : 0;

    const avgResponseTime = reviewedCount > 0
      ? Math.round(totalResponseTime / reviewedCount)
      : null;

    const response: AnalyticsResponse = {
      totalApplications,
      newThisWeek,
      newThisMonth,
      statusCounts,
      timeline,
      funnel,
      avgResponseTime,
      responseRate,
      hireRate,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
