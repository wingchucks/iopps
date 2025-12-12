import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/firebase-admin";
import type { EmailPreferences, Conference } from "@/lib/types";
import {
  wrapEmail,
  emailHeader,
  conferenceCardHtml,
  ctaButton,
  getUnsubscribeUrl,
  conferenceAlertText,
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
    const frequency = body.frequency || "weekly"; // instant, daily, weekly

    console.log(`Processing ${frequency} conference alerts...`);

    // Calculate lookback period
    const now = new Date();
    let lookbackMs: number;
    switch (frequency) {
      case "instant":
        lookbackMs = 60 * 60 * 1000; // 1 hour
        break;
      case "daily":
        lookbackMs = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case "weekly":
      default:
        lookbackMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    }
    const lookbackDate = new Date(now.getTime() - lookbackMs);

    // Get recent conferences
    const conferencesSnap = await db
      .collection("conferences")
      .where("active", "==", true)
      .where("createdAt", ">=", lookbackDate)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (conferencesSnap.empty) {
      console.log("No new conferences in the lookback period");
      return NextResponse.json({
        success: true,
        message: "No new conferences to alert about",
        processed: 0,
      });
    }

    const conferences = conferencesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Conference[];

    console.log(`Found ${conferences.length} new conferences`);

    // Get users with conference updates enabled
    const prefsSnap = await db
      .collection("emailPreferences")
      .where("unsubscribedAll", "==", false)
      .where("conferenceUpdates", "==", true)
      .where("conferenceFrequency", "==", frequency)
      .get();

    if (prefsSnap.empty) {
      console.log(`No users subscribed to ${frequency} conference alerts`);
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

        // Filter conferences by user's category preferences
        let filteredConferences = conferences;
        if (prefs?.conferenceCategories && prefs.conferenceCategories.length > 0) {
          filteredConferences = conferences.filter((c) =>
            prefs.conferenceCategories.includes(c.category || "")
          );
        }

        if (filteredConferences.length === 0) continue;

        // Generate email content
        const subject = `${filteredConferences.length} New Conference${filteredConferences.length > 1 ? "s" : ""} on IOPPS`;
        const unsubscribeUrl = getUnsubscribeUrl(userId, email, "conferences");

        const conferenceCards = filteredConferences
          .slice(0, 5)
          .map((c) =>
            conferenceCardHtml({
              id: c.id,
              name: c.name,
              organizerName: c.organizerName,
              location: c.location,
              startDate: c.startDate?.toDate?.() || null,
              description: c.description,
            })
          )
          .join("");

        const moreText =
          filteredConferences.length > 5
            ? `<tr><td style="padding: 20px; text-align: center; color: #94a3b8;">... and ${filteredConferences.length - 5} more conferences. <a href="${SITE_URL}/conferences" style="color: #14B8A6;">View all</a></td></tr>`
            : "";

        const htmlContent = wrapEmail(
          `${emailHeader("New Conferences", `${filteredConferences.length} event${filteredConferences.length > 1 ? "s" : ""} added to IOPPS`)}
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${conferenceCards}
                ${moreText}
              </table>
            </td>
          </tr>
          ${ctaButton("Browse All Conferences", `${SITE_URL}/conferences`)}`,
          unsubscribeUrl
        );

        const textContent = conferenceAlertText(
          filteredConferences.map((c) => ({
            id: c.id,
            name: c.name,
            location: c.location,
            startDate: c.startDate?.toDate?.() || null,
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

    console.log(`Sent ${emailsSent} conference alert emails`);

    return NextResponse.json({
      success: true,
      emailsSent,
      conferencesFound: conferences.length,
      frequency,
    });
  } catch (error) {
    console.error("Conference alerts error:", error);
    return NextResponse.json(
      { error: "Failed to process conference alerts" },
      { status: 500 }
    );
  }
}
