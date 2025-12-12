import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/firebase-admin";
import type { EmailPreferences, Vendor } from "@/lib/types";
import {
  wrapEmail,
  emailHeader,
  vendorCardHtml,
  ctaButton,
  getUnsubscribeUrl,
  vendorAlertText,
} from "@/lib/emails/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://iopps.ca";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    console.error("Firebase Admin not initialized");
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const frequency = body.frequency || "weekly";

    console.log(`Processing ${frequency} vendor alerts...`);

    // Calculate lookback period
    const now = new Date();
    let lookbackMs: number;
    switch (frequency) {
      case "instant":
        lookbackMs = 60 * 60 * 1000;
        break;
      case "daily":
        lookbackMs = 24 * 60 * 60 * 1000;
        break;
      case "weekly":
      default:
        lookbackMs = 7 * 24 * 60 * 60 * 1000;
    }
    const lookbackDate = new Date(now.getTime() - lookbackMs);

    // Get recent approved vendors
    const vendorsSnap = await db
      .collection("vendors")
      .where("status", "==", "active")
      .where("createdAt", ">=", lookbackDate)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (vendorsSnap.empty) {
      console.log("No new vendors in the lookback period");
      return NextResponse.json({
        success: true,
        message: "No new vendors to alert about",
        processed: 0,
      });
    }

    const vendors = vendorsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Vendor[];

    console.log(`Found ${vendors.length} new vendors`);

    // Get users with shop updates enabled
    const prefsSnap = await db
      .collection("emailPreferences")
      .where("unsubscribedAll", "==", false)
      .where("shopUpdates", "==", true)
      .where("shopFrequency", "==", frequency)
      .get();

    if (prefsSnap.empty) {
      console.log(`No users subscribed to ${frequency} shop alerts`);
      return NextResponse.json({
        success: true,
        message: "No subscribers for this frequency",
        processed: 0,
      });
    }

    console.log(`Found ${prefsSnap.size} subscribers`);

    // Get user emails
    const userIds = prefsSnap.docs.map((doc) => doc.id);
    const userEmails: Record<string, string> = {};

    for (const userId of userIds) {
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const email = userDoc.data()?.email;
          if (email) userEmails[userId] = email;
        }
      } catch (err) {
        console.error(`Error fetching user ${userId}:`, err);
      }
    }

    // Send emails
    const resend = new Resend(process.env.RESEND_API_KEY);
    let emailsSent = 0;

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured - skipping email send");
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Email API not configured",
        wouldHaveSent: Object.keys(userEmails).length,
      });
    }

    for (const [userId, email] of Object.entries(userEmails)) {
      try {
        const prefs = prefsSnap.docs.find((d) => d.id === userId)?.data() as EmailPreferences | undefined;

        // Filter by category preferences
        let filteredVendors = vendors;
        if (prefs?.shopCategories && prefs.shopCategories.length > 0) {
          filteredVendors = vendors.filter((v) =>
            prefs.shopCategories.includes(v.category || "")
          );
        }

        if (filteredVendors.length === 0) continue;

        // Generate email content
        const subject = `${filteredVendors.length} New Business${filteredVendors.length > 1 ? "es" : ""} on Shop Indigenous`;
        const unsubscribeUrl = getUnsubscribeUrl(userId, email, "shop");

        const vendorCards = filteredVendors
          .slice(0, 5)
          .map((v) =>
            vendorCardHtml({
              slug: v.slug,
              businessName: v.businessName,
              tagline: v.tagline,
              category: v.category,
              location: v.location,
              logoUrl: v.logoUrl,
            })
          )
          .join("");

        const moreText =
          filteredVendors.length > 5
            ? `<tr><td style="padding: 20px; text-align: center; color: #94a3b8;">... and ${filteredVendors.length - 5} more businesses. <a href="${SITE_URL}/shop" style="color: #14B8A6;">View all</a></td></tr>`
            : "";

        const htmlContent = wrapEmail(
          `${emailHeader("Shop Indigenous", `${filteredVendors.length} new business${filteredVendors.length > 1 ? "es" : ""} joined IOPPS`)}
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${vendorCards}
                ${moreText}
              </table>
            </td>
          </tr>
          ${ctaButton("Browse Shop Indigenous", `${SITE_URL}/shop`)}`,
          unsubscribeUrl
        );

        const textContent = vendorAlertText(
          filteredVendors.map((v) => ({
            slug: v.slug,
            businessName: v.businessName,
            category: v.category,
          }))
        );

        // Send email
        const { error } = await resend.emails.send({
          from: "IOPPS <updates@iopps.ca>",
          to: [email],
          subject,
          html: htmlContent,
          text: textContent,
        });

        // Log the email
        await db.collection("emailLogs").add({
          userId,
          userEmail: email,
          campaignType: "vendor-alerts",
          subject,
          status: error ? "failed" : "sent",
          error: error?.message || null,
          sentAt: new Date(),
        });

        if (error) {
          console.error(`Error sending to ${email}:`, error);
          continue;
        }

        emailsSent++;
      } catch (err) {
        console.error(`Error processing email for user ${userId}:`, err);
      }
    }

    console.log(`Sent ${emailsSent} vendor alert emails`);

    return NextResponse.json({
      success: true,
      emailsSent,
      vendorsFound: vendors.length,
      frequency,
    });
  } catch (error) {
    console.error("Vendor alerts error:", error);
    return NextResponse.json(
      { error: "Failed to process vendor alerts" },
      { status: 500 }
    );
  }
}
