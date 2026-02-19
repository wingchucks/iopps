import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Total users
  const usersSnap = await adminDb.collection("users").get();
  const totalUsers = usersSnap.size;

  // New this month
  const newSnap = await adminDb.collection("users")
    .where("createdAt", ">=", startOfMonth.toISOString())
    .get();
  const newThisMonth = newSnap.size;

  // Active employers
  const employersSnap = await adminDb.collection("users")
    .where("role", "==", "employer")
    .where("status", "==", "active")
    .get();
  const activeEmployers = employersSnap.size;

  // Total jobs
  const jobsSnap = await adminDb.collection("jobs").get();
  const totalJobs = jobsSnap.size;

  // Growth: user signups per month (last 6 months)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const growthMap: Record<string, number> = {};
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    growthMap[`${monthNames[d.getMonth()]} ${d.getFullYear()}`] = 0;
  }

  const recentUsers = await adminDb.collection("users")
    .where("createdAt", ">=", sixMonthsAgo.toISOString())
    .get();
  recentUsers.docs.forEach((doc) => {
    const d = new Date(doc.data().createdAt);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (key in growthMap) growthMap[key]++;
  });

  const growth = Object.entries(growthMap).map(([month, count]) => ({ month, count }));

  // Top jobs by viewCount
  const topJobsSnap = await adminDb.collection("jobs").orderBy("viewCount", "desc").limit(5).get();
  const topJobs = topJobsSnap.docs.map((doc) => {
    const d = doc.data();
    return { id: doc.id, title: d.title || "Untitled", views: d.viewCount || 0, applications: d.applicationCount || 0 };
  });

  // Top events by engagement
  const topEventsSnap = await adminDb.collection("events").orderBy("engagement", "desc").limit(5).get();
  const topEvents = topEventsSnap.docs.map((doc) => {
    const d = doc.data();
    return { id: doc.id, title: d.title || "Untitled", engagement: d.engagement || 0 };
  });

  // Demographics: nation
  const profilesSnap = await adminDb.collection("memberProfiles").get();
  const nationMap: Record<string, number> = {};
  const treatyMap: Record<string, number> = {};
  profilesSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.nation) nationMap[d.nation] = (nationMap[d.nation] || 0) + 1;
    if (d.treaty) treatyMap[d.treaty] = (treatyMap[d.treaty] || 0) + 1;
  });

  const nations = Object.entries(nationMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const treaties = Object.entries(treatyMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    totalUsers,
    newThisMonth,
    activeEmployers,
    totalJobs,
    growth,
    topJobs,
    topEvents,
    nations,
    treaties,
  });
}
