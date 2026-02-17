"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Badge from "@/components/Badge";
import Link from "next/link";

const emailJobs = [
  { title: "Executive Director", org: "SIGA", loc: "Saskatoon, SK", salary: "$95K-$120K", badge: "Featured" },
  { title: "Community Health Nurse", org: "Saskatoon Tribal Council", loc: "Saskatoon, SK", salary: "", badge: "via STC Careers" },
  { title: "IT Support Analyst", org: "SIGA", loc: "Regina, SK", salary: "$55K-$65K", badge: "" },
  { title: "Indigenous Studies Instructor", org: "FNUniv", loc: "Regina, SK", salary: "", badge: "Education Partner" },
  { title: "Youth Program Coordinator", org: "Meadow Lake Tribal Council", loc: "Meadow Lake, SK", salary: "", badge: "" },
];

const emailEvents = [
  { title: "Back to Batoche Days", date: "Jul 18-20", loc: "Batoche, SK", type: "Pow Wow" },
  { title: "Treaty 6 Career Fair", date: "Aug 5", loc: "Saskatoon, SK", type: "Career Fair" },
  { title: "Round Dance", date: "Mar 22", loc: "Prince Albert, SK", type: "Round Dance" },
];

export default function NewsletterPreviewPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <NewsletterPreviewContent />
      </div>
    </ProtectedRoute>
  );
}

function NewsletterPreviewContent() {
  return (
    <div className="max-w-[700px] mx-auto" style={{ padding: "32px 24px" }}>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <Link href="/admin/email-campaigns" className="text-[13px] text-teal font-semibold no-underline">
            &#8592; Back to Campaigns
          </Link>
          <h2 className="text-xl font-extrabold text-text mt-1.5 mb-0">Newsletter Preview</h2>
        </div>
        <Badge text="Weekly Digest" color="var(--teal)" bg="var(--teal-soft)" />
      </div>

      {/* Email Preview Container */}
      <div className="rounded-2xl" style={{ background: "#E8ECEF", padding: 24 }}>
        <div
          className="max-w-[600px] mx-auto rounded-xl overflow-hidden"
          style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,.08)" }}
        >
          {/* Email Header */}
          <div
            className="text-center"
            style={{
              background: "linear-gradient(135deg, var(--navy), #0D3B66)",
              padding: "28px 32px 20px",
            }}
          >
            <p className="text-white text-[28px] font-black tracking-[3px] mb-1.5">IOPPS</p>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: 8, fontWeight: 800, letterSpacing: 2.5, marginBottom: 12 }}>
              EMPOWERING INDIGENOUS SUCCESS
            </p>
            <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13 }}>
              Your Weekly Opportunities Digest — February 10, 2026
            </p>
          </div>

          {/* Greeting */}
          <div style={{ padding: "24px 32px 16px" }}>
            <p className="text-[15px] text-text font-semibold mb-1.5">Hey Nathan,</p>
            <p className="text-[13px] text-text-sec leading-relaxed m-0">
              Here&apos;s what&apos;s new on IOPPS this week. 12 new jobs posted, 3 upcoming events, and a new scholarship just dropped.
            </p>
          </div>

          {/* Jobs Section */}
          <div style={{ padding: "0 32px 20px" }}>
            <div
              className="flex items-center gap-2 mb-3 pb-2"
              style={{ borderBottom: "2px solid rgba(13,148,136,.13)" }}
            >
              <span className="text-base">&#128188;</span>
              <p className="text-sm font-extrabold text-teal m-0 tracking-[0.5px]">NEW JOBS THIS WEEK</p>
              <span className="text-xs text-text-muted ml-auto">12 new</span>
            </div>
            {emailJobs.map((job, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2.5"
                style={{ borderBottom: i < emailJobs.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div>
                  <p className="text-[13px] font-bold text-text mb-0.5">{job.title}</p>
                  <p className="text-[11px] text-text-sec m-0">
                    {job.org} &middot; {job.loc}{job.salary ? ` \u00b7 ${job.salary}` : ""}
                  </p>
                </div>
                {job.badge && (
                  <Badge
                    text={job.badge}
                    color={
                      job.badge === "Featured"
                        ? "var(--gold)"
                        : job.badge.includes("Education")
                          ? "var(--teal)"
                          : "var(--text-muted)"
                    }
                    bg={
                      job.badge === "Featured"
                        ? "var(--gold-soft)"
                        : job.badge.includes("Education")
                          ? "var(--teal-soft)"
                          : "#F1F5F9"
                    }
                    small
                  />
                )}
              </div>
            ))}
            <div className="text-center mt-3.5">
              <span
                className="inline-block rounded-[10px] text-white text-[13px] font-bold"
                style={{ padding: "10px 28px", background: "var(--teal)" }}
              >
                View All 12 Jobs on IOPPS &#8594;
              </span>
            </div>
          </div>

          {/* Events Section */}
          <div style={{ padding: "0 32px 20px" }}>
            <div
              className="flex items-center gap-2 mb-3 pb-2"
              style={{ borderBottom: "2px solid rgba(217,119,6,.13)" }}
            >
              <span className="text-base">&#129718;</span>
              <p className="text-sm font-extrabold text-gold m-0 tracking-[0.5px]">UPCOMING EVENTS</p>
            </div>
            {emailEvents.map((evt, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2.5"
                style={{ borderBottom: i < emailEvents.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div>
                  <p className="text-[13px] font-bold text-text mb-0.5">{evt.title}</p>
                  <p className="text-[11px] text-text-sec m-0">
                    &#128197; {evt.date} &middot; &#128205; {evt.loc}
                  </p>
                </div>
                <Badge text={evt.type} color="var(--gold)" bg="var(--gold-soft)" small />
              </div>
            ))}
          </div>

          {/* Scholarship Section */}
          <div style={{ padding: "0 32px 20px" }}>
            <div
              className="flex items-center gap-2 mb-3 pb-2"
              style={{ borderBottom: "2px solid rgba(124,58,237,.13)" }}
            >
              <span className="text-base">&#127891;</span>
              <p className="text-sm font-extrabold text-purple m-0 tracking-[0.5px]">NEW SCHOLARSHIP</p>
              <Badge text="Closing Soon" color="var(--red)" bg="var(--red-soft)" small />
            </div>
            <div
              className="rounded-[10px]"
              style={{
                padding: 14,
                background: "rgba(124,58,237,.04)",
                border: "1px solid rgba(124,58,237,.09)",
              }}
            >
              <p className="text-sm font-bold text-text mb-1">Indigenous Health Sciences Bursary</p>
              <p className="text-xs text-text-sec mb-1">
                First Nations University of Canada &middot; Up to $5,000
              </p>
              <p className="text-[11px] text-red font-semibold m-0">
                &#9200; Deadline: March 1, 2026 — 13 days left
              </p>
            </div>
          </div>

          {/* Spotlight Section */}
          <div style={{ padding: "0 32px 20px" }}>
            <div
              className="flex items-center gap-2 mb-3 pb-2"
              style={{ borderBottom: "2px solid rgba(220,38,38,.13)" }}
            >
              <span className="text-base">&#128250;</span>
              <p className="text-sm font-extrabold text-red m-0 tracking-[0.5px]">IOPPS SPOTLIGHT</p>
            </div>
            <div className="flex gap-3 items-center">
              <div
                className="w-20 h-[50px] rounded-lg flex items-center justify-center text-[22px] shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(220,38,38,.13), rgba(15,43,76,.09))" }}
              >
                &#9654;&#65039;
              </div>
              <div>
                <p className="text-[13px] font-bold text-text mb-0.5">Interview with Chief Tanya Stone</p>
                <p className="text-[11px] text-text-sec m-0">Watch the full interview on IOPPS Spotlight</p>
              </div>
            </div>
          </div>

          {/* Email Footer */}
          <div
            className="text-center border-t border-border"
            style={{ background: "#F8FAFC", padding: "20px 32px" }}
          >
            <p className="text-lg font-black text-navy tracking-[2px] mb-1.5">IOPPS</p>
            <p className="text-teal mb-2.5 opacity-60" style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2 }}>
              EMPOWERING INDIGENOUS SUCCESS
            </p>
            <p className="text-[11px] text-text-muted mb-1.5">
              You&apos;re receiving this because you signed up at iopps.ca
            </p>
            <p className="text-[11px] text-text-muted mb-1.5">
              <span className="text-teal cursor-pointer">Manage preferences</span>
              <span> &middot; </span>
              <span className="text-teal cursor-pointer">Unsubscribe</span>
            </p>
            <p className="text-[10px] m-0" style={{ color: "#CBD5E1" }}>
              IOPPS &middot; Saskatchewan, Canada
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
