import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { createdInPeriod, recordedAmount, reportingTimestamp } from "@/lib/admin/reporting";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;
  if (!adminDb) return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  const range = request.nextUrl.searchParams.get("range") || "30";
  if (!["7", "30", "90", "all"].includes(range)) return NextResponse.json({error: "Invalid range"}, {status: 400});
  try {
    const now = new Date();
    const cutoff = range === "all" ? null : now.getTime() - Number(range) * 86400000;
    const startOfMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const growthMonths = range === "7" ? 1 : range === "30" ? 3 : range === "90" ? 6 : 12;
    const growthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - growthMonths + 1, 1);
    const usersSnap = await adminDb.collection("users").get();
    const jobsSnap = await adminDb.collection("jobs").get();
    const users = usersSnap.docs.map(doc => doc.data());
    const jobs = jobsSnap.docs.map(doc => doc.data());
    const count = (records: Record<string, unknown>[]) => records.filter(record => createdInPeriod(record, cutoff, now.getTime())).length;
    const undated = (records: Record<string, unknown>[]) => records.filter(record => reportingTimestamp(record.createdAt) === null).length;
    const totalUsers = count(users);
    const totalJobs = count(jobs);
    const newThisMonth = users.filter(record => createdInPeriod(record, startOfMonth, now.getTime())).length;
    // Historical role/status flags are user records, not organizations posting jobs.
    const activeEmployers = users.filter(record => record.role === "employer" && record.status === "active").length;
    const monthly = Array.from({length: growthMonths}, (_, i) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - growthMonths + 1 + i, 1));
      const key = date.toISOString().slice(0, 7);
      return {key, month: date.toLocaleDateString("en-CA", {month: "short", year: "numeric", timeZone: "UTC"}), count: 0};
    });
    const userGrowth = monthly.map(row => ({...row}));
    const employerGrowth = monthly.map(row => ({...row}));
    for (const record of users) {
      const timestamp = reportingTimestamp(record.createdAt);
      if (timestamp === null || timestamp < growthStart || timestamp > now.getTime()) continue;
      const key = new Date(timestamp).toISOString().slice(0, 7);
      const index = monthly.findIndex(row => row.key === key);
      if (index >= 0) {
        userGrowth[index].count++;
        if (record.role === "employer") employerGrowth[index].count++;
      }
    }
    let applicationsCount: number | null = null;
    let savedJobsCount: number | null = null;
    let undatedApplications: number | null = null;
    let undatedSavedJobs: number | null = null;
    try {
      const records = (await adminDb.collection("applications").get()).docs.map(doc => doc.data());
      applicationsCount = count(records);
      undatedApplications = undated(records);
    } catch { /* A failed read is unavailable, never a measured zero. */ }
    try {
      const records = (await adminDb.collection("savedJobs").get()).docs.map(doc => doc.data());
      savedJobsCount = count(records);
      undatedSavedJobs = undated(records);
    } catch { /* A failed read is unavailable, never a measured zero. */ }
    const topJobsSnap = await adminDb.collection("jobs").orderBy("viewCount", "desc").limit(5).get();
    const topJobs = topJobsSnap.docs.map(doc => {
      const data = doc.data();
      return {id: doc.id, title: data.title || "Untitled", views: recordedAmount(data.viewCount), applications: recordedAmount(data.applicationCount)};
    });
    const topEventsSnap = await adminDb.collection("events").orderBy("engagement", "desc").limit(5).get();
    const topEvents = topEventsSnap.docs.map(doc => ({id: doc.id, title: doc.data().title || doc.data().name || "Untitled", engagement: recordedAmount(doc.data().engagement)}));
    const profilesSnap = await adminDb.collection("memberProfiles").get();
    const nationMap: Record<string, number> = {};
    const treatyMap: Record<string, number> = {};
    for (const doc of profilesSnap.docs) {
      const data = doc.data();
      if (data.nation) nationMap[data.nation] = (nationMap[data.nation] || 0) + 1;
      if (data.treaty) treatyMap[data.treaty] = (treatyMap[data.treaty] || 0) + 1;
    }
    const topNations = Object.entries(nationMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({name, count}));
    const treatyAreas = Object.entries(treatyMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({name, count}));
    return NextResponse.json({
      totalUsers, newThisMonth, activeEmployers, totalJobs, userGrowth, employerGrowth,
      applicationsCount, savedJobsCount, topJobs, topEvents, topNations, treatyAreas,
      revenue: {subscriptionRevenue: null, oneTimePayments: null, activeSubscriptions: null, available: false},
      scope: {
        range, from: cutoff === null ? null : new Date(cutoff).toISOString(), through: now.toISOString(), timeZone: "UTC",
        chartMonths: growthMonths, chartFrom: new Date(growthStart).toISOString(),
        undatedUsers: undated(users), undatedJobs: undated(jobs), undatedApplications, undatedSavedJobs,
      },
    });
  } catch (error) {
    console.error("Failed to load admin reports:", error);
    return NextResponse.json({error: "Failed to load reports"}, {status: 500});
  }
}
