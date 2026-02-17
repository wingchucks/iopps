import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const include = searchParams.get("include");

  // Base counts
  const [members, orgs, verifiedOrgs, pendingOrgs, jobs, events, scholarships, programs, pendingMod] = await Promise.all([
    adminDb.collection("users").where("disabled", "==", false).count().get(),
    adminDb.collection("organizations").where("disabled", "==", false).count().get(),
    adminDb.collection("organizations").where("verification", "==", "verified").count().get(),
    adminDb.collection("organizations").where("verification", "==", "unverified").count().get(),
    adminDb.collection("posts").where("type", "==", "job").where("status", "==", "active").count().get(),
    adminDb.collection("posts").where("type", "==", "event").where("status", "==", "active").count().get(),
    adminDb.collection("posts").where("type", "==", "scholarship").where("status", "==", "active").count().get(),
    adminDb.collection("posts").where("type", "==", "program").where("status", "==", "active").count().get(),
    adminDb.collection("posts").where("status", "==", "draft").count().get(),
  ]);

  const result: Record<string, unknown> = {
    totalMembers: members.data().count,
    totalOrgs: orgs.data().count,
    verifiedOrgs: verifiedOrgs.data().count,
    pendingOrgs: pendingOrgs.data().count,
    activeJobs: jobs.data().count,
    activeEvents: events.data().count,
    activeScholarships: scholarships.data().count,
    activePrograms: programs.data().count,
    pendingModeration: pendingMod.data().count,
    revenueMonth: 0,
    revenueYear: 0,
  };

  // Revenue from payments collection
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const paymentsSnap = await adminDb.collection("payments")
    .where("createdAt", ">=", startOfYear)
    .orderBy("createdAt", "desc")
    .get();

  let revenueMonth = 0, revenueYear = 0;
  paymentsSnap.docs.forEach((doc) => {
    const d = doc.data();
    const amount = d.amount || 0;
    revenueYear += amount;
    const ts = d.createdAt?.toDate?.() || new Date(0);
    if (ts >= startOfMonth) revenueMonth += amount;
  });
  result.revenueMonth = revenueMonth;
  result.revenueYear = revenueYear;

  // Optional includes
  if (include === "payments") {
    const allPayments = await adminDb.collection("payments").orderBy("createdAt", "desc").get();
    result.revenueAllTime = allPayments.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

    const subsSnap = await adminDb.collection("organizations")
      .where("subscription.tier", "in", ["tier1", "tier2", "school"]).get();
    result.activeSubscriptions = subsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        orgId: doc.id, orgName: d.name, tier: d.subscription?.tier,
        currentPeriodEnd: d.subscription?.currentPeriodEnd?.toDate?.()?.toISOString() || "",
      };
    });

    result.recentPayments = paymentsSnap.docs.slice(0, 20).map((doc) => {
      const d = doc.data();
      return { id: doc.id, orgName: d.orgName || d.orgId, amount: d.amount, date: d.createdAt?.toDate?.()?.toISOString() || "", type: d.productType };
    });
  }

  if (include === "reports") {
    const usersThisMonth = await adminDb.collection("users").where("createdAt", ">=", startOfMonth).count().get();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const usersLastMonth = await adminDb.collection("users")
      .where("createdAt", ">=", lastMonth).where("createdAt", "<", startOfMonth).count().get();
    const orgsThisMonth = await adminDb.collection("organizations").where("createdAt", ">=", startOfMonth).count().get();

    const topPosts = await adminDb.collection("posts").orderBy("viewCount", "desc").limit(10).get();

    result.newUsersThisMonth = usersThisMonth.data().count;
    result.newUsersLastMonth = usersLastMonth.data().count;
    result.newOrgsThisMonth = orgsThisMonth.data().count;
    result.topViewedPosts = topPosts.docs.map((doc) => {
      const d = doc.data();
      return { id: doc.id, title: d.title, type: d.type, views: d.viewCount || 0 };
    });
    result.postsByType = {
      job: jobs.data().count,
      event: events.data().count,
      scholarship: scholarships.data().count,
      program: programs.data().count,
    };
  }

  if (include === "campaigns") {
    const campaignsSnap = await adminDb.collection("campaigns").orderBy("createdAt", "desc").limit(50).get();
    result.campaigns = campaignsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  if (include === "campaign") {
    const campaignId = searchParams.get("campaignId");
    if (campaignId) {
      const doc = await adminDb.collection("campaigns").doc(campaignId).get();
      result.campaign = doc.exists ? { id: doc.id, ...doc.data() } : null;
    }
  }

  if (include === "data") {
    const dataDoc = await adminDb.collection("config").doc("dropdownData").get();
    result.dropdownData = dataDoc.exists ? dataDoc.data() : {};
  }

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const body = await request.json();

  if (body.dropdownData) {
    await adminDb.collection("config").doc("dropdownData").set(body.dropdownData, { merge: true });
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const body = await request.json();

  if (body.action === "createCampaign") {
    const { action: _, ...campaignData } = body;
    const ref = await adminDb.collection("campaigns").add({
      ...campaignData,
      sentBy: authResult.decodedToken.uid,
      stats: { total: 0, delivered: 0, bounced: 0, opened: 0, clicked: 0, unsubscribed: 0 },
      sentAt: null,
      createdAt: new Date(),
    });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
