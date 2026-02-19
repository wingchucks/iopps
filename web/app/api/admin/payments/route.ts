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


  try {
    // Fetch employers with subscription data
    const employersSnap = await adminDb.collection("employers").get();

    const active: Record<string, unknown>[] = [];
    const expired: Record<string, unknown>[] = [];

    employersSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (!data.stripeSubscriptionId && !data.plan) return;

      const sub = {
        id: doc.id,
        name: data.name || data.organizationName || "Unknown",
        plan: data.plan || "essential",
        stripeSubscriptionId: data.stripeSubscriptionId || null,
        stripeCustomerId: data.stripeCustomerId || null,
        subscriptionStatus: data.subscriptionStatus || "unknown",
        subscriptionStartDate: data.subscriptionStartDate?.toDate?.()?.toISOString() || data.subscriptionStartDate || null,
        subscriptionEndDate: data.subscriptionEndDate?.toDate?.()?.toISOString() || data.subscriptionEndDate || null,
        email: data.email || data.contactEmail || null,
      };

      if (
        data.subscriptionStatus === "active" ||
        data.subscriptionStatus === "trialing"
      ) {
        active.push(sub);
      } else {
        expired.push(sub);
      }
    });

    // Fetch one-time payment jobs
    const jobsSnap = await adminDb
      .collection("jobs")
      .where("paymentType", "!=", null)
      .limit(200)
      .get();

    const oneTime = jobsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "Untitled Job",
        employer: data.employerName || data.company || "Unknown",
        paymentType: data.paymentType,
        amount: data.paymentAmount || null,
        paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt || null,
        status: data.paymentStatus || "completed",
      };
    });

    // Calculate summary
    const planPrices: Record<string, number> = {
      essential: 1250,
      professional: 2500,
      school: 5500,
    };

    const monthlyRevenue = active.reduce((sum, s) => {
      const annual = planPrices[(s.plan as string)?.toLowerCase()] || 0;
      return sum + annual / 12;
    }, 0);

    return NextResponse.json({
      summary: {
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        activeSubscriptions: active.length,
        expiredSubscriptions: expired.length,
        oneTimePayments: oneTime.length,
      },
      active,
      expired,
      oneTime,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment data" },
      { status: 500 }
    );
  }
}
