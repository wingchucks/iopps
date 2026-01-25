import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/firebase-admin";
import type { TrainingProgram } from "@/lib/types";
import {
  wrapEmail,
  emailHeader,
  trainingCardHtml,
  ctaButton,
  getUnsubscribeUrl,
  trainingAlertText,
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

    console.log(`Processing ${frequency} training program alerts...`);

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

    // Get recent approved training programs
    const programsSnap = await db
      .collection("training_programs")
      .where("status", "==", "approved")
      .where("active", "==", true)
      .where("createdAt", ">=", lookbackDate)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (programsSnap.empty) {
      console.log("No new training programs in the lookback period");
      return NextResponse.json({
        success: true,
        message: "No new training programs to alert about",
        processed: 0,
      });
    }

    const programs = programsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TrainingProgram[];

    console.log(`Found ${programs.length} new training programs`);

    // Get users with training updates enabled
    const prefsSnap = await db
      .collection("emailPreferences")
      .where("unsubscribedAll", "==", false)
      .where("trainingUpdates", "==", true)
      .where("trainingFrequency", "==", frequency)
      .get();

    if (prefsSnap.empty) {
      console.log(`No users subscribed to ${frequency} training alerts`);
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
    const userPrefs: Record<string, { categories: string[]; formats: string[] }> = {};

    for (const doc of prefsSnap.docs) {
      const userId = doc.id;
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const email = userDoc.data()?.email;
          if (email) {
            userEmails[userId] = email;
            const prefs = doc.data();
            userPrefs[userId] = {
              categories: prefs.trainingCategories || [],
              formats: prefs.trainingFormats || [],
            };
          }
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
        const prefs = userPrefs[userId];

        // Filter programs by user preferences
        let filteredPrograms = programs;

        // Filter by category preferences if specified
        if (prefs.categories && prefs.categories.length > 0) {
          filteredPrograms = filteredPrograms.filter(
            (p) => p.category && prefs.categories.includes(p.category)
          );
        }

        // Filter by format preferences if specified
        if (prefs.formats && prefs.formats.length > 0) {
          filteredPrograms = filteredPrograms.filter(
            (p) => p.format && prefs.formats.includes(p.format)
          );
        }

        if (filteredPrograms.length === 0) continue;

        // Generate email content
        const subject = `${filteredPrograms.length} New Training Program${filteredPrograms.length > 1 ? "s" : ""} on IOPPS`;
        const unsubscribeUrl = getUnsubscribeUrl(userId, email, "training");

        const programCards = filteredPrograms
          .slice(0, 5)
          .map((p) =>
            trainingCardHtml({
              id: p.id,
              title: p.title,
              providerName: p.providerName,
              format: p.format,
              duration: p.duration,
              location: p.location,
              cost: p.cost,
              fundingAvailable: p.fundingAvailable,
              certificationOffered: p.certificationOffered,
            })
          )
          .join("");

        const moreText =
          filteredPrograms.length > 5
            ? `<tr><td style="padding: 20px; text-align: center; color: #94a3b8;">... and ${filteredPrograms.length - 5} more programs. <a href="${SITE_URL}/careers/programs" style="color: #a855f7;">View all</a></td></tr>`
            : "";

        const htmlContent = wrapEmail(
          `${emailHeader("New Training Programs", `${filteredPrograms.length} program${filteredPrograms.length > 1 ? "s" : ""} added to IOPPS`)}
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${programCards}
                ${moreText}
              </table>
            </td>
          </tr>
          ${ctaButton("Browse All Training Programs", `${SITE_URL}/careers/programs`)}`,
          unsubscribeUrl
        );

        const textContent = trainingAlertText(
          filteredPrograms.map((p) => ({
            id: p.id,
            title: p.title,
            providerName: p.providerName,
            format: p.format,
            duration: p.duration,
            location: p.location,
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
          campaignType: "training-alerts",
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

    console.log(`Sent ${emailsSent} training program alert emails`);

    return NextResponse.json({
      success: true,
      emailsSent,
      programsFound: programs.length,
      frequency,
    });
  } catch (error) {
    console.error("Training alerts error:", error);
    return NextResponse.json(
      { error: "Failed to process training alerts" },
      { status: 500 }
    );
  }
}
