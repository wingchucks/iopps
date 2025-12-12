import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/firebase-admin";
import type { EmailPreferences, Powwow } from "@/lib/types";
import {
  wrapEmail,
  emailHeader,
  powwowCardHtml,
  ctaButton,
  getUnsubscribeUrl,
  powwowAlertText,
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

    console.log(`Processing ${frequency} pow wow alerts...`);

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

    // Get recent pow wows/events
    const powwowsSnap = await db
      .collection("powwows")
      .where("active", "==", true)
      .where("createdAt", ">=", lookbackDate)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (powwowsSnap.empty) {
      console.log("No new pow wows in the lookback period");
      return NextResponse.json({
        success: true,
        message: "No new pow wows to alert about",
        processed: 0,
      });
    }

    const powwows = powwowsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Powwow[];

    console.log(`Found ${powwows.length} new pow wows/events`);

    // Get users with pow wow updates enabled
    const prefsSnap = await db
      .collection("emailPreferences")
      .where("unsubscribedAll", "==", false)
      .where("powwowUpdates", "==", true)
      .where("powwowFrequency", "==", frequency)
      .get();

    if (prefsSnap.empty) {
      console.log(`No users subscribed to ${frequency} pow wow alerts`);
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

        // Filter by region preferences
        let filteredPowwows = powwows;
        if (prefs?.powwowRegions && prefs.powwowRegions.length > 0) {
          filteredPowwows = powwows.filter((p) =>
            prefs.powwowRegions.some((region) =>
              p.location?.toLowerCase().includes(region.toLowerCase()) ||
              p.region?.toLowerCase().includes(region.toLowerCase())
            )
          );
        }

        if (filteredPowwows.length === 0) continue;

        // Generate email content
        const subject = `${filteredPowwows.length} New Pow Wow${filteredPowwows.length > 1 ? "s" : ""} & Event${filteredPowwows.length > 1 ? "s" : ""} on IOPPS`;
        const unsubscribeUrl = getUnsubscribeUrl(userId, email, "powwows");

        const eventCards = filteredPowwows
          .slice(0, 5)
          .map((p) =>
            powwowCardHtml({
              id: p.id,
              name: p.name,
              location: p.location,
              startDate: p.startDate?.toDate?.() || null,
              eventType: p.eventType,
            })
          )
          .join("");

        const moreText =
          filteredPowwows.length > 5
            ? `<tr><td style="padding: 20px; text-align: center; color: #94a3b8;">... and ${filteredPowwows.length - 5} more events. <a href="${SITE_URL}/powwows" style="color: #14B8A6;">View all</a></td></tr>`
            : "";

        const htmlContent = wrapEmail(
          `${emailHeader("Pow Wows & Events", `${filteredPowwows.length} event${filteredPowwows.length > 1 ? "s" : ""} added to IOPPS`)}
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${eventCards}
                ${moreText}
              </table>
            </td>
          </tr>
          ${ctaButton("Browse All Events", `${SITE_URL}/powwows`)}`,
          unsubscribeUrl
        );

        const textContent = powwowAlertText(
          filteredPowwows.map((p) => ({
            id: p.id,
            name: p.name,
            location: p.location,
            startDate: p.startDate?.toDate?.() || null,
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

        if (error) {
          console.error(`Error sending to ${email}:`, error);
          continue;
        }

        emailsSent++;
      } catch (err) {
        console.error(`Error processing email for user ${userId}:`, err);
      }
    }

    console.log(`Sent ${emailsSent} pow wow alert emails`);

    return NextResponse.json({
      success: true,
      emailsSent,
      powwowsFound: powwows.length,
      frequency,
    });
  } catch (error) {
    console.error("Pow wow alerts error:", error);
    return NextResponse.json(
      { error: "Failed to process pow wow alerts" },
      { status: 500 }
    );
  }
}
