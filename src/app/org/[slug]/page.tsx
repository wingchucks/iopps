"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";

const stats = [
  { label: "Open Jobs", value: "12", icon: "\u{1F4BC}" },
  { label: "Employees", value: "4,000+", icon: "\u{1F465}" },
  { label: "Casinos", value: "7", icon: "\u{1F3E2}" },
  { label: "Since", value: "2023", icon: "\u{1F4C5}" },
];

const jobs = [
  "Executive Director",
  "Surveillance Officer",
  "Table Games Dealer",
  "Food & Beverage Manager",
  "IT Support Analyst",
  "Marketing Coordinator",
];

export default function OrgProfilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <OrgProfileContent />
      </div>
    </ProtectedRoute>
  );
}

function OrgProfileContent() {
  return (
    <div className="max-w-[900px] mx-auto">
      {/* Hero Header */}
      <div
        className="rounded-b-3xl"
        style={{
          background: "linear-gradient(160deg, var(--navy), #0D3B66 60%, var(--teal))",
          padding: "clamp(24px, 4vw, 40px) clamp(16px, 4vw, 48px)",
        }}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
          <Avatar name="SIGA" size={64} />
          <div className="flex-1">
            <h1 className="text-xl sm:text-[28px] font-extrabold text-white mb-1.5">
              Saskatchewan Indian Gaming Authority
            </h1>
            <p className="text-[15px] mb-2.5" style={{ color: "rgba(255,255,255,.7)" }}>
              &#128205; Saskatoon, SK &bull; siga.ca
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge text="&#10003; Premium Partner" color="#F5D78E" bg="rgba(245,215,142,.15)" small />
              <Badge text="&#10003; Verified" color="#6EE7B7" bg="rgba(110,231,183,.15)" small />
              <Badge text="Indigenous-Owned" color="#F5D78E" bg="rgba(245,215,142,.15)" small />
            </div>
          </div>
          <div className="flex gap-2.5 mt-2 sm:mt-0">
            <Button small style={{ color: "#fff", borderColor: "rgba(255,255,255,.25)" }}>
              &#128172; Message
            </Button>
          </div>
        </div>
        <p
          className="text-center mt-5"
          style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,.4)" }}
        >
          EMPOWERING INDIGENOUS SUCCESS
        </p>
      </div>

      {/* Content */}
      <div className="px-4 py-6 md:px-12">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-7">
          {stats.map((s, i) => (
            <div key={i} className="p-4 bg-bg rounded-[14px] text-center">
              <span className="text-[22px]">{s.icon}</span>
              <p className="text-[22px] font-extrabold text-text mt-1 mb-0">{s.value}</p>
              <p className="text-[11px] text-text-muted m-0">{s.label}</p>
            </div>
          ))}
        </div>

        {/* About */}
        <h3 className="text-lg font-bold text-text mb-2.5">About</h3>
        <p className="text-sm text-text-sec leading-relaxed mb-6">
          SIGA operates seven casinos across Saskatchewan, employing over 4,000 people.
          As the province&apos;s largest employer of Indigenous people, SIGA is committed to
          Indigenous economic self-sufficiency and community development through gaming
          entertainment.
        </p>

        {/* Open Positions */}
        <h3 className="text-lg font-bold text-text mb-3">Open Positions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {jobs.map((j, i) => {
            const slug = j.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-siga";
            return (
              <Link key={i} href={`/jobs/${slug}`} className="no-underline">
                <Card className="cursor-pointer">
                  <div className="flex justify-between items-center" style={{ padding: "14px 16px" }}>
                    <div>
                      <Badge text="Job" color="var(--blue)" bg="var(--blue-soft)" small />
                      <p className="text-sm font-bold text-text mt-1 mb-0">{j}</p>
                    </div>
                    <span className="text-text-muted">&#8250;</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
