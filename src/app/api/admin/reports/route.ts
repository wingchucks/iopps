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

  const range = request.nextUrl.searchParams.get("range") || "30";
  const now = new Date();

  // Determine date cutoff based on range
  let cutoffDate: Date | null = null;
  if (range === "7") {
    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "30") {
    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === "90") {
    cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
  // "all" means no cutoff

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Determine how many months of growth data to show
  const growthMonths = range === "7" ? 1 : range === "30" ? 3 : range === "90" ? 6 : 12;
  const growthStart = new Date(now.getFullYear(), now.getMonth() - (growthMonths - 1), 1);

  // Total users
  const usersSnap = await adminDb.collection("users").get();
  const allUsers = usersSnap.docs;
  const totalUsers = cutoffDate
    ? allUsers.filter((doc) => {
        const ca = doc.data().createdAt;
        return ca && new Date(ca) >= cutoffDate;
      }).length
    : allUsers.length;

  // New this month (always current month)
  const newThisMonth = allUsers.filter((doc) => {
    const ca = doc.data().createdAt;
    return ca && new Date(ca) >= startOfMonth;
  }).length;

  // Active employers
  const employersSnap = await adminDb.collection("users")
    .where("role", "==", "employer")
    .where("status", "==", "active")
    .get();
  const activeEmployers = employersSnap.size;

  // Total jobs
  const jobsSnap = await adminDb.collection("jobs").get();
  const totalJobs = cutoffDate
    ? jobsSnap.docs.filter((doc) => {
        const ca = doc.data().createdAt;
        return ca && new Date(ca) >= cutoffDate;
      }).length
    : jobsSnap.size;

  // Growth: user signups per month
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const userGrowthMap: Record<string, number> = {};
  const employerGrowthMap: Record<string, number> = {};
  for (let i = 0; i < growthMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (growthMonths - 1 - i), 1);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    userGrowthMap[key] = 0;
    employerGrowthMap[key] = 0;
  }

  const recentUsers = await adminDb.collection("users")
    .where("createdAt", ">=", growthStart.toISOString())
    .get();
  recentUsers.docs.forEach((doc) => {
    const data = doc.data();
    const ca = data.createdAt;
    if (!ca) return;
    const d = new Date(ca);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (key in userGrowthMap) userGrowthMap[key]++;
    if (data.role === "employer" && key in employerGrowthMap) employerGrowthMap[key]++;
  });

  const userGrowth = Object.entries(userGrowthMap).map(([month, count]) => ({ month, count }));
  const employerGrowth = Object.entries(employerGrowthMap).map(([month, count]) => ({ month, count }));

  // Applications count
  let applicationsCount = 0;
  try {
    const appsSnap = await adminDb.collection("applications").get();
    applicationsCount = cutoffDate
      ? appsSnap.docs.filter((doc) => {
          const ca = doc.data().createdAt;
          return ca && new Date(ca) >= cutoffDate;
        }).length
      : appsSnap.size;
  } catch {
    // collection may not exist
  }

  // Saved jobs count
  let savedJobsCount = 0;
  try {
    const savedSnap = await adminDb.collection("savedJobs").get();
    savedJobsCount = cutoffDate
      ? savedSnap.docs.filter((doc) => {
          const ca = doc.data().createdAt;
          return ca && new Date(ca) >= cutoffDate;
        }).length
      : savedSnap.size;
  } catch {
    // collection may not exist
  }

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

  // Demographics: nation and treaty area
  const profilesSnap = await adminDb.collection("memberProfiles").get();
  const nationMap: Record<string, number> = {};
  const treatyMap: Record<string, number> = {};
  profilesSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.nation) nationMap[d.nation] = (nationMap[d.nation] || 0) + 1;
    if (d.treaty) treatyMap[d.treaty] = (treatyMap[d.treaty] || 0) + 1;
  });

  const topNations = Object.entries(nationMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const treatyAreas = Object.entries(treatyMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Revenue placeholders
  const revenue = {
    subscriptionRevenue: 0,
    oneTimePayments: 0,
    activeSubscriptions: 0,
  };

  // Try to read real revenue data if collection exists
  try {
    const subsSnap = await adminDb.collection("subscriptions").where("status", "==", "active").get();
    revenue.activeSubscriptions = subsSnap.size;
    subsSnap.docs.forEach((doc) => {
      const d = doc.data();
      revenue.subscriptionRevenue += d.amount || 0;
    });
  } catch {
    // collection may not exist
  }

  try {
    const paymentsSnap = await adminDb.collection("payments").where("type", "==", "one-time").get();
    paymentsSnap.docs.forEach((doc) => {
      const d = doc.data();
      revenue.oneTimePayments += d.amount || 0;
    });
  } catch {
    // collection may not exist
  }

  return NextResponse.json({
    totalUsers,
    newThisMonth,
    activeEmployers,
    totalJobs,
    userGrowth,
    employerGrowth,
    applicationsCount,
    savedJobsCount,
    topJobs,
    topEvents,
    topNations,
    treatyAreas,
    revenue,
  });
}
