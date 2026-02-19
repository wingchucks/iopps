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

    const oneTime = jobsSnap.docs
      .filter((doc) => {
        const data = doc.data();
        return data.paymentType !== "school-program";
      })
      .map((doc) => {
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

    // School Program payments ($50 each)
    let schoolProgram: Record<string, unknown>[] = [];
    try {
      const schoolSnap = await adminDb
        .collection("schoolProgramPayments")
        .orderBy("paidAt", "desc")
        .limit(200)
        .get();
      schoolProgram = schoolSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.studentName || data.participantName || "Unknown",
          employer: data.schoolName || data.institution || "Unknown",
          paymentType: "school-program",
          amount: data.amount || 50,
          paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt || null,
          status: data.status || "completed",
        };
      });
    } catch {
      // Collection may not exist yet; also check for school-program type in jobs
      schoolProgram = jobsSnap.docs
        .filter((doc) => doc.data().paymentType === "school-program")
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || data.studentName || "Unknown",
            employer: data.employerName || data.schoolName || "Unknown",
            paymentType: "school-program",
            amount: data.paymentAmount || 50,
            paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt || null,
            status: data.paymentStatus || "completed",
          };
        });
    }

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

    // Total revenue = annual from active subs + one-time + school program
    const annualSubRevenue = active.reduce((sum, s) => {
      return sum + (planPrices[(s.plan as string)?.toLowerCase()] || 0);
    }, 0);
    const oneTimeTotal = oneTime.reduce((sum, p) => sum + (p.amount || 0), 0);
    const schoolProgramRevenue = schoolProgram.reduce((sum, p) => sum + ((p.amount as number) || 50), 0);
    const totalRevenue = annualSubRevenue + oneTimeTotal + schoolProgramRevenue;

    // Simple growth estimate (placeholder - positive if more active than expired)
    const growthPercent = expired.length > 0
      ? ((active.length - expired.length) / Math.max(expired.length, 1)) * 100
      : active.length > 0 ? 100 : 0;

    return NextResponse.json({
      summary: {
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        totalRevenue: Math.round(totalRevenue),
        growthPercent: Math.round(growthPercent * 10) / 10,
        activeSubscriptions: active.length,
        expiredSubscriptions: expired.length,
        oneTimePayments: oneTime.length,
        schoolProgramPayments: schoolProgram.length,
        schoolProgramRevenue: Math.round(schoolProgramRevenue),
      },
      active,
      expired,
      oneTime,
      schoolProgram,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment data" },
      { status: 500 }
    );
  }
}
