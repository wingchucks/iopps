"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";

const job = {
  title: "Executive Director",
  org: "Saskatchewan Indian Gaming Authority",
  orgShort: "SIGA",
  location: "Saskatoon, SK",
  type: "Full-time",
  salary: "$95,000 - $120,000",
  deadline: "March 15, 2026",
  posted: "February 10, 2026",
  description: `SIGA is seeking an experienced Executive Director to lead strategic planning, operations oversight, and community engagement initiatives across our seven casino properties in Saskatchewan.

The Executive Director will report directly to the Board of Directors and will be responsible for ensuring the organization's mission of Indigenous economic self-sufficiency is advanced through effective leadership and operational excellence.`,
  responsibilities: [
    "Lead strategic planning and organizational development",
    "Oversee operations across all seven casino properties",
    "Build and maintain relationships with First Nations communities",
    "Manage annual budget of $200M+ and ensure fiscal responsibility",
    "Represent SIGA in government and industry consultations",
    "Drive Indigenous employment and community development initiatives",
  ],
  qualifications: [
    "10+ years of senior leadership experience",
    "Experience in gaming, hospitality, or related industries",
    "Strong understanding of Indigenous governance and culture",
    "MBA or equivalent advanced degree preferred",
    "Proven track record in strategic planning and execution",
    "Excellent communication and stakeholder management skills",
  ],
  benefits: [
    "Comprehensive health & dental benefits",
    "Pension plan with employer matching",
    "Professional development funding",
    "Relocation assistance available",
    "Cultural leave days",
  ],
};

export default function JobDetailPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <JobDetailContent />
      </div>
    </ProtectedRoute>
  );
}

function JobDetailContent() {
  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Feed
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>&#11088;</span>} />
              <Badge text="Closing Soon" color="var(--red)" bg="var(--red-soft)" small />
              <Badge text="Full-time" color="var(--blue)" bg="var(--blue-soft)" small />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-3">{job.title}</h1>
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={job.orgShort} size={40} gradient="linear-gradient(135deg, var(--navy), var(--teal))" />
              <div>
                <Link href="/org/siga" className="text-[15px] text-teal font-bold no-underline hover:underline">
                  {job.org}
                </Link>
                <div className="flex items-center gap-1.5">
                  <Badge text="&#10003; Premium Partner" color="var(--gold)" bg="var(--gold-soft)" small />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-text-sec">
              <span>&#128205; {job.location}</span>
              <span>&#128176; {job.salary}</span>
              <span>&#128197; Deadline: {job.deadline}</span>
            </div>
          </div>

          {/* Description */}
          <h3 className="text-lg font-bold text-text mb-2">About This Role</h3>
          <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
            {job.description}
          </p>

          {/* Responsibilities */}
          <h3 className="text-lg font-bold text-text mb-2">Responsibilities</h3>
          <ul className="mb-6 pl-0 list-none">
            {job.responsibilities.map((r, i) => (
              <li key={i} className="flex gap-2 items-start mb-2">
                <span className="text-teal text-sm mt-0.5">&#10003;</span>
                <span className="text-sm text-text-sec">{r}</span>
              </li>
            ))}
          </ul>

          {/* Qualifications */}
          <h3 className="text-lg font-bold text-text mb-2">Qualifications</h3>
          <ul className="mb-6 pl-0 list-none">
            {job.qualifications.map((q, i) => (
              <li key={i} className="flex gap-2 items-start mb-2">
                <span className="text-blue text-sm mt-0.5">&#9679;</span>
                <span className="text-sm text-text-sec">{q}</span>
              </li>
            ))}
          </ul>

          {/* Benefits */}
          <h3 className="text-lg font-bold text-text mb-2">Benefits</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {job.benefits.map((b, i) => (
              <span
                key={i}
                className="rounded-xl text-[13px] font-semibold text-teal"
                style={{
                  padding: "8px 14px",
                  background: "rgba(13,148,136,.06)",
                  border: "1.5px solid rgba(13,148,136,.1)",
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Apply Card */}
          <Card className="mb-4" style={{ position: "sticky", top: 80 }}>
            <div style={{ padding: 20 }}>
              <Button
                primary
                full
                style={{
                  background: "var(--teal)",
                  padding: "14px 24px",
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Apply Now
              </Button>
              <Button
                full
                style={{
                  borderRadius: 14,
                  padding: "12px 24px",
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                &#128278; Save Job
              </Button>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">JOB DETAILS</p>
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Type</span>
                    <span className="text-xs font-semibold text-text">{job.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Salary</span>
                    <span className="text-xs font-semibold text-text">{job.salary}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Location</span>
                    <span className="text-xs font-semibold text-text">{job.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Posted</span>
                    <span className="text-xs font-semibold text-text">{job.posted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Deadline</span>
                    <span className="text-xs font-semibold text-red">{job.deadline}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Company Card */}
          <Card>
            <div style={{ padding: 16 }}>
              <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">ABOUT THE COMPANY</p>
              <div className="flex gap-2.5 items-center mb-2.5">
                <Avatar name={job.orgShort} size={36} gradient="linear-gradient(135deg, var(--navy), var(--teal))" />
                <div>
                  <p className="text-sm font-bold text-text m-0">{job.orgShort}</p>
                  <p className="text-[11px] text-text-muted m-0">7 casinos &bull; 4,000+ employees</p>
                </div>
              </div>
              <p className="text-xs text-text-sec leading-relaxed mb-3">
                Saskatchewan&apos;s largest employer of Indigenous people, operating seven casinos province-wide.
              </p>
              <Link href="/org/siga" className="text-xs text-teal font-semibold no-underline hover:underline">
                View Company Profile &#8594;
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
