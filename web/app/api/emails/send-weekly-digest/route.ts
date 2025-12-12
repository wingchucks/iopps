import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/firebase-admin";
import type { JobPosting, Conference, PowwowEvent, Vendor } from "@/lib/types";
import {
  wrapEmail,
  emailHeader,
  ctaButton,
  getUnsubscribeUrl,
  escapeHtml,
} from "@/lib/emails/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://iopps.ca";
const BRAND_COLOR = "#14B8A6";

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
    console.log("Processing weekly digest...");

    // Get content from the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch new jobs
    const jobsSnap = await db
      .collection("jobs")
      .where("active", "==", true)
      .where("createdAt", ">=", weekAgo)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const jobs = jobsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as JobPosting[];

    // Fetch new conferences
    const conferencesSnap = await db
      .collection("conferences")
      .where("active", "==", true)
      .where("createdAt", ">=", weekAgo)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const conferences = conferencesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Conference[];

    // Fetch new pow wows
    const powwowsSnap = await db
      .collection("powwows")
      .where("active", "==", true)
      .where("createdAt", ">=", weekAgo)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const powwows = powwowsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PowwowEvent[];

    // Fetch new vendors
    const vendorsSnap = await db
      .collection("vendors")
      .where("status", "==", "active")
      .where("createdAt", ">=", weekAgo)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const vendors = vendorsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Vendor[];

    // Check if there's any content to share
    const totalContent = jobs.length + conferences.length + powwows.length + vendors.length;
    if (totalContent === 0) {
      console.log("No new content for weekly digest");
      return NextResponse.json({
        success: true,
        message: "No new content for digest",
        processed: 0,
      });
    }

    console.log(`Digest content: ${jobs.length} jobs, ${conferences.length} conferences, ${powwows.length} events, ${vendors.length} vendors`);

    // Get users with weekly digest enabled
    const prefsSnap = await db
      .collection("emailPreferences")
      .where("unsubscribedAll", "==", false)
      .where("weeklyDigest", "==", true)
      .get();

    if (prefsSnap.empty) {
      console.log("No users subscribed to weekly digest");
      return NextResponse.json({
        success: true,
        message: "No subscribers",
        processed: 0,
      });
    }

    console.log(`Found ${prefsSnap.size} digest subscribers`);

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
        const unsubscribeUrl = getUnsubscribeUrl(userId, email, "digest");

        // Build digest sections
        const sections: string[] = [];

        // Jobs section
        if (jobs.length > 0) {
          const jobsList = jobs.slice(0, 5).map((job) => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #2d2d35;">
                <a href="${SITE_URL}/jobs/${job.id}" style="color: ${BRAND_COLOR}; text-decoration: none; font-weight: 600;">${escapeHtml(job.title)}</a>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
                  ${escapeHtml(job.employerName || "")} · ${escapeHtml(job.location || "")}
                </div>
              </td>
            </tr>
          `).join("");

          sections.push(`
            <tr>
              <td style="padding: 24px;">
                <h2 style="margin: 0 0 16px; font-size: 20px; color: #f1f5f9;">🎯 New Jobs (${jobs.length})</h2>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${jobsList}
                </table>
                <div style="margin-top: 16px;">
                  <a href="${SITE_URL}/jobs" style="color: ${BRAND_COLOR}; font-size: 14px;">View all jobs →</a>
                </div>
              </td>
            </tr>
          `);
        }

        // Conferences section
        if (conferences.length > 0) {
          const confList = conferences.slice(0, 3).map((conf) => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #2d2d35;">
                <a href="${SITE_URL}/conferences/${conf.id}" style="color: ${BRAND_COLOR}; text-decoration: none; font-weight: 600;">${escapeHtml(conf.title)}</a>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
                  ${escapeHtml(conf.location || "")}
                </div>
              </td>
            </tr>
          `).join("");

          sections.push(`
            <tr>
              <td style="padding: 24px; background: #16161b;">
                <h2 style="margin: 0 0 16px; font-size: 20px; color: #f1f5f9;">📅 Conferences (${conferences.length})</h2>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${confList}
                </table>
                <div style="margin-top: 16px;">
                  <a href="${SITE_URL}/conferences" style="color: ${BRAND_COLOR}; font-size: 14px;">View all conferences →</a>
                </div>
              </td>
            </tr>
          `);
        }

        // Pow Wows section
        if (powwows.length > 0) {
          const powwowList = powwows.slice(0, 3).map((pw) => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #2d2d35;">
                <a href="${SITE_URL}/powwows/${pw.id}" style="color: ${BRAND_COLOR}; text-decoration: none; font-weight: 600;">${escapeHtml(pw.name)}</a>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
                  ${escapeHtml(pw.location || "")}
                </div>
              </td>
            </tr>
          `).join("");

          sections.push(`
            <tr>
              <td style="padding: 24px;">
                <h2 style="margin: 0 0 16px; font-size: 20px; color: #f1f5f9;">✨ Pow Wows & Events (${powwows.length})</h2>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${powwowList}
                </table>
                <div style="margin-top: 16px;">
                  <a href="${SITE_URL}/powwows" style="color: ${BRAND_COLOR}; font-size: 14px;">View all events →</a>
                </div>
              </td>
            </tr>
          `);
        }

        // Vendors section
        if (vendors.length > 0) {
          const vendorList = vendors.slice(0, 3).map((v) => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #2d2d35;">
                <a href="${SITE_URL}/shop/${v.slug}" style="color: ${BRAND_COLOR}; text-decoration: none; font-weight: 600;">${escapeHtml(v.businessName)}</a>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
                  ${escapeHtml(v.category || "")}${v.location ? ` · ${escapeHtml(v.location)}` : ""}
                </div>
              </td>
            </tr>
          `).join("");

          sections.push(`
            <tr>
              <td style="padding: 24px; background: #16161b;">
                <h2 style="margin: 0 0 16px; font-size: 20px; color: #f1f5f9;">🛍️ Shop Indigenous (${vendors.length})</h2>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${vendorList}
                </table>
                <div style="margin-top: 16px;">
                  <a href="${SITE_URL}/shop" style="color: ${BRAND_COLOR}; font-size: 14px;">Browse all shops →</a>
                </div>
              </td>
            </tr>
          `);
        }

        const htmlContent = wrapEmail(
          `${emailHeader("Your Weekly IOPPS Digest", `${totalContent} new opportunities this week`)}
          ${sections.join("")}
          ${ctaButton("Explore IOPPS", SITE_URL)}`,
          unsubscribeUrl
        );

        const textContent = `Your Weekly IOPPS Digest

${jobs.length > 0 ? `NEW JOBS (${jobs.length})\n${jobs.slice(0, 5).map((j) => `- ${j.title} at ${j.employerName}`).join("\n")}\n\n` : ""}
${conferences.length > 0 ? `CONFERENCES (${conferences.length})\n${conferences.slice(0, 3).map((c) => `- ${c.title}`).join("\n")}\n\n` : ""}
${powwows.length > 0 ? `POW WOWS & EVENTS (${powwows.length})\n${powwows.slice(0, 3).map((p) => `- ${p.name}`).join("\n")}\n\n` : ""}
${vendors.length > 0 ? `SHOP INDIGENOUS (${vendors.length})\n${vendors.slice(0, 3).map((v) => `- ${v.businessName}`).join("\n")}\n\n` : ""}
---
Explore: ${SITE_URL}
Manage preferences: ${SITE_URL}/member/email-preferences`;

        // Send email
        const { error } = await resend.emails.send({
          from: "IOPPS <digest@iopps.ca>",
          to: [email],
          subject: `Your Weekly IOPPS Digest - ${totalContent} New Opportunities`,
          html: htmlContent,
          text: textContent,
        });

        if (error) {
          console.error(`Error sending to ${email}:`, error);
          continue;
        }

        emailsSent++;
      } catch (err) {
        console.error(`Error processing digest for user ${userId}:`, err);
      }
    }

    console.log(`Sent ${emailsSent} weekly digest emails`);

    return NextResponse.json({
      success: true,
      emailsSent,
      content: {
        jobs: jobs.length,
        conferences: conferences.length,
        powwows: powwows.length,
        vendors: vendors.length,
      },
    });
  } catch (error) {
    console.error("Weekly digest error:", error);
    return NextResponse.json(
      { error: "Failed to process weekly digest" },
      { status: 500 }
    );
  }
}
