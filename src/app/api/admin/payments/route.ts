import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { getPlanById, normalizePaidTier } from "@/lib/pricing";
import { isComplimentarySubscription } from "@/lib/server/partner-subscription";

import { recordedAmount, reportingTimestamp } from "@/lib/admin/reporting";

export const dynamic = "force-dynamic";

const RECEIPT_LIMIT = 1000;
const LAPSED_STATUSES = new Set(["expired", "canceled", "cancelled", "past_due", "inactive"]);

function isoDate(value: unknown): string | null {
  const time = reportingTimestamp(value);
  return time === null ? null : new Date(time).toISOString();
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;
  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }


  try {
    // Fetch employers with subscription data
    const employersSnap = await adminDb.collection("employers").get();
    // Stripe fulfillment, admin overrides and Hermes write receipts here. Unordered reads avoid
    // composite indexes; records are sorted in memory and the scope states the read cap.
    const [oneTimeSnap, annualSnap] = await Promise.all([
      adminDb.collection("subscriptions").where("billingCycle", "==", "one-time").limit(RECEIPT_LIMIT + 1).get(),
      adminDb.collection("subscriptions").where("billingCycle", "==", "annual").limit(RECEIPT_LIMIT + 1).get(),
    ]);

    // Last annual tier per account, so a lapsed account still shows the plan it held.
    const lastAnnualTier = new Map<string, { tier: string; end: number }>();
    for (const doc of annualSnap.docs.slice(0, RECEIPT_LIMIT)) {
      const receipt = doc.data();
      const owner = String(receipt.employerId ?? receipt.orgId ?? "");
      const tier = normalizePaidTier(receipt.plan);
      const end = reportingTimestamp(receipt.expiresAt) ?? 0;
      if (!owner || !tier || Number(receipt.amount) <= 0) continue;
      if ((lastAnnualTier.get(owner)?.end ?? -1) < end) lastAnnualTier.set(owner, { tier, end });
    }

    const active: Record<string, unknown>[] = [];
    const expired: Record<string, unknown>[] = [];
    const names = new Map<string, string>();

    employersSnap.docs.forEach((doc) => {
      const data = doc.data();
      const nested = (data.subscription && typeof data.subscription === "object" ? data.subscription : {}) as Record<string, unknown>;
      names.set(doc.id, String(data.name || data.organizationName || data.companyName || doc.id));
      const status = String(data.subscriptionStatus || nested.status || "unknown");
      const paidTier = normalizePaidTier(data.subscriptionTier || data.plan) ?? normalizePaidTier(nested.tier);
      const subscriptionEndDate = isoDate(data.subscriptionEnd ?? nested.subscriptionEnd ?? data.subscriptionEndDate);
      const lapsed = LAPSED_STATUSES.has(status.toLowerCase()) && (subscriptionEndDate !== null || lastAnnualTier.has(doc.id));
      // Free accounts that never held a plan are not plan records.
      if (!paidTier && !data.stripeSubscriptionId && !lapsed) return;

      const sub = {
        id: doc.id,
        name: data.name || data.organizationName || "Unknown",
        plan: paidTier || lastAnnualTier.get(doc.id)?.tier || data.plan || "unknown",
        stripeSubscriptionId: data.stripeSubscriptionId || null,
        stripeCustomerId: data.stripeCustomerId || null,
        subscriptionStatus: status,
        subscriptionStartDate: isoDate(data.subscriptionStart ?? data.billingStartAt ?? nested.billingStartAt ?? data.subscriptionStartDate),
        subscriptionEndDate,
        complimentary: Boolean(paidTier) && isComplimentarySubscription(data),
        email: data.email || data.contactEmail || null,
      };

      if (
        status === "active" ||
        status === "trialing"
      ) {
        active.push(sub);
      } else {
        expired.push(sub);
      }
    });

    // One-time Stripe purchases (single job postings and program posts) are receipts.
    const oneTime = oneTimeSnap.docs.slice(0, RECEIPT_LIMIT)
      .map((doc) => {
        const data = doc.data();
        const owner = String(data.orgId ?? data.employerId ?? "");
        const plan = getPlanById(typeof data.plan === "string" ? data.plan : null);
        return {
          id: doc.id,
          title: plan?.title || (typeof data.plan === "string" && data.plan) || "Unknown purchase",
          employer: names.get(owner) || owner || "Unknown",
          paymentType: typeof data.plan === "string" ? data.plan : "unknown",
          amount: recordedAmount(data.totalAmount),
          paidAt: isoDate(data.createdAt),
          status: typeof data.status === "string" ? data.status : "unknown",
        };
      })
      .sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));

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

    // Entitlement assignments and receipts are not reconciled cash. No Stripe
    // account reconciliation or invoice history is available from these reads.
    return NextResponse.json({
      summary: {
        monthlyRevenue: null,
        totalRevenue: null,
        growthPercent: null,
        activePlanRecords: active.filter(record => record.subscriptionStatus === "active").length,
        trialPlanRecords: active.filter(record => record.subscriptionStatus === "trialing").length,
        linkedPlanRecords: active.filter(record => record.stripeSubscriptionId).length,
        complimentaryPlanRecords: active.filter(record => record.complimentary).length,
        otherPlanRecords: expired.length,
        oneTimePaymentRecords: oneTime.length,
        schoolProgramPaymentRecords: schoolProgramAvailable ? schoolProgram.length : null,
      },
      scope: {
        employerRecords: "all", oneTimeReceiptLimit: RECEIPT_LIMIT, oneTimeReceiptsTruncated: oneTimeSnap.size > RECEIPT_LIMIT,
        schoolPaymentMetadataLimit: 200, schoolProgramAvailable,
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
