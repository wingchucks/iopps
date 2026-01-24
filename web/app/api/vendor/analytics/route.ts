import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth || !db) {
      return NextResponse.json({ error: "Not initialized" }, { status: 500 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get vendor for this user
    const vendorsSnap = await db
      .collection("vendors")
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (vendorsSnap.empty) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const vendorDoc = vendorsSnap.docs[0];
    const vendorId = vendorDoc.id;
    const vendorData = vendorDoc.data();

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousThirtyDays = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get view logs if they exist
    const viewsRef = db.collection("vendorViews");

    // Get views for last 30 days
    const recentViewsSnap = await viewsRef
      .where("vendorId", "==", vendorId)
      .where("viewedAt", ">=", thirtyDaysAgo)
      .get();

    // Get views for previous 30 days (for comparison)
    const previousViewsSnap = await viewsRef
      .where("vendorId", "==", vendorId)
      .where("viewedAt", ">=", previousThirtyDays)
      .where("viewedAt", "<", thirtyDaysAgo)
      .get();

    // Calculate daily view counts
    const dailyViews: Record<string, number> = {};
    const last30Days: string[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      last30Days.push(dateKey);
      dailyViews[dateKey] = 0;
    }

    recentViewsSnap.forEach((doc) => {
      const data = doc.data();
      const viewDate = data.viewedAt?.toDate?.();
      if (viewDate) {
        const dateKey = viewDate.toISOString().split("T")[0];
        if (dailyViews[dateKey] !== undefined) {
          dailyViews[dateKey]++;
        }
      }
    });

    // Get product count
    const productsSnap = await db
      .collection("vendorProducts")
      .where("vendorId", "==", vendorId)
      .where("active", "==", true)
      .count()
      .get();

    // Get inquiries if they exist
    const inquiriesSnap = await db
      .collection("vendorInquiries")
      .where("vendorId", "==", vendorId)
      .count()
      .get();

    // Calculate totals
    const totalViews = vendorData.viewCount || 0;
    const viewsLast30Days = recentViewsSnap.size;
    const viewsPrevious30Days = previousViewsSnap.size;
    const viewsChange = viewsPrevious30Days > 0
      ? Math.round(((viewsLast30Days - viewsPrevious30Days) / viewsPrevious30Days) * 100)
      : 100;

    // Calculate weekly views
    let viewsLast7Days = 0;
    recentViewsSnap.forEach((doc) => {
      const data = doc.data();
      const viewDate = data.viewedAt?.toDate?.();
      if (viewDate && viewDate >= sevenDaysAgo) {
        viewsLast7Days++;
      }
    });

    // Get top traffic days
    const sortedDays = Object.entries(dailyViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([date, count]) => ({
        date,
        dayOfWeek: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        views: count,
      }));

    return NextResponse.json({
      totalViews,
      viewsLast7Days,
      viewsLast30Days,
      viewsChange,
      productCount: productsSnap.data().count,
      inquiryCount: inquiriesSnap.data().count,
      dailyViews: last30Days.map((date) => ({
        date,
        views: dailyViews[date],
      })),
      topDays: sortedDays,
      status: vendorData.status,
      subscriptionStatus: vendorData.subscriptionStatus,
    });
  } catch (error) {
    console.error("Vendor analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
