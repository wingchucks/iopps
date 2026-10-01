import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { normalizePaidTier } from "@/lib/pricing";

import { recordedAmount, reportingTimestamp } from "@/lib/admin/reporting";

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
      const normalizedPlan = normalizePaidTier(data.subscriptionTier || data.plan);

      const sub = {
        id: doc.id,
        name: data.name || data.organizationName || "Unknown",
        plan: normalizedPlan || data.plan || "unknown",
        stripeSubscriptionId: data.stripeSubscriptionId || null,
        stripeCustomerId: data.stripeCustomerId || null,
        subscriptionStatus: data.subscriptionStatus || "unknown",
        subscriptionStartDate: (reportingTimestamp(data.subscriptionStartDate) === null ? null : new Date(reportingTimestamp(data.subscriptionStartDate)!).toISOString()),
        subscriptionEndDate: (reportingTimestamp(data.subscriptionEndDate) === null ? null : new Date(reportingTimestamp(data.subscriptionEndDate)!).toISOString()),
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
          amount: recordedAmount(data.paymentAmount),
          paidAt: (reportingTimestamp(data.paidAt) === null ? null : new Date(reportingTimestamp(data.paidAt)!).toISOString()),
          status: data.paymentStatus || "unknown",
        };
      });

    // School Program payments ($50 each)
    let schoolProgram: Record<string, unknown>[] = [];
    let schoolProgramAvailable = true;
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
          amount: recordedAmount(data.amount),
          paidAt: (reportingTimestamp(data.paidAt) === null ? null : new Date(reportingTimestamp(data.paidAt)!).toISOString()),
          status: data.status || "unknown",
        };
      });
    } catch {
      schoolProgramAvailable = false;
    }

    // Entitlement assignments and job metadata are not cash receipts. No Stripe
    // account reconciliation or invoice history is available from these reads.
    return NextResponse.json({
      summary: {
        monthlyRevenue: null,
        totalRevenue: null,
        growthPercent: null,
        activePlanRecords: active.filter(record => record.subscriptionStatus === "active").length,
        trialPlanRecords: active.filter(record => record.subscriptionStatus === "trialing").length,
        linkedPlanRecords: active.filter(record => record.stripeSubscriptionId).length,
        otherPlanRecords: expired.length,
        oneTimePaymentRecords: oneTime.length,
        schoolProgramPaymentRecords: schoolProgramAvailable ? schoolProgram.length : null,
      },
      scope: { employerRecords: "all", jobPaymentMetadataLimit: 200, schoolPaymentMetadataLimit: 200, schoolProgramAvailable },
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
