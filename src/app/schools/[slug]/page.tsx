"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";

const stats = [
  { label: "Programs", value: "18", icon: "\u{1F4DA}" },
  { label: "Open Jobs", value: "3", icon: "\u{1F4BC}" },
  { label: "Students", value: "3,200+", icon: "\u{1F465}" },
  { label: "Campuses", value: "3", icon: "\u{1F3DB}\u{FE0F}" },
];

const programs = [
  { name: "Indigenous Business Administration", dur: "4 years", cred: "Bachelor's", featured: true },
  { name: "Indigenous Social Work", dur: "4 years", cred: "Bachelor's", featured: true },
  { name: "Indigenous Health Studies", dur: "2 years", cred: "Certificate", featured: false },
  { name: "Cree Language & Culture", dur: "1 year", cred: "Certificate", featured: false },
];

const supports = [
  "Elders-in-Residence program",
  "Indigenous student advisors",
  "Cultural ceremonies & events",
  "Treaty education integrated curriculum",
  "Indigenous language courses (Cree, Saulteaux, Dakota)",
];

const openPositions = [
  "Indigenous Studies Instructor — Full-time",
  "Student Recruitment Coordinator — Full-time",
];

export default function SchoolProfilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <SchoolProfileContent />
      </div>
    </ProtectedRoute>
  );
}

function SchoolProfileContent() {
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
          <Avatar
            name="FNUniv"
            size={64}
            gradient="linear-gradient(135deg, var(--teal), var(--blue))"
          />
          <div className="flex-1">
            <h1 className="text-xl sm:text-[28px] font-extrabold text-white mb-1.5">
              First Nations University of Canada
            </h1>
            <p className="text-[15px] mb-2.5" style={{ color: "rgba(255,255,255,.7)" }}>
              &#128205; Regina, SK &bull; fnuniv.ca
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge text="&#127891; Education Partner" color="#fff" bg="rgba(255,255,255,.15)" small />
              <Badge text="&#10003; Verified" color="#6EE7B7" bg="rgba(110,231,183,.15)" small />
              <Badge text="Indigenous-Owned" color="#F5D78E" bg="rgba(245,215,142,.15)" small />
            </div>
          </div>
          <div className="flex gap-2.5 mt-2 sm:mt-0">
            <Button
              small
              style={{ color: "#fff", borderColor: "rgba(255,255,255,.25)" }}
            >
              &#128172; Message
            </Button>
            <Button small primary style={{ background: "var(--teal)" }}>
              Visit Website
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div>
            <h3 className="text-lg font-bold text-text mb-2.5">About</h3>
            <p className="text-sm text-text-sec leading-relaxed mb-5">
              First Nations University of Canada is a First Nations-controlled university
              with a mandate to enhance the quality of life and preserve, protect, and
              interpret the history, language, culture, and artistic heritage of First
              Nations peoples.
            </p>

            {/* Indigenous Student Support */}
            <div
              className="rounded-[14px] mb-5"
              style={{
                padding: 16,
                background: "rgba(13,148,136,.04)",
                border: "1.5px solid rgba(13,148,136,.09)",
              }}
            >
              <p className="text-sm font-bold text-teal mb-2.5">
                &#129718; Indigenous Student Support
              </p>
              {supports.map((s, i) => (
                <div key={i} className="flex gap-2 items-center mb-1">
                  <span className="text-xs text-teal">&#10003;</span>
                  <span className="text-[13px] text-text-sec">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div>
            <h3 className="text-lg font-bold text-text mb-3">Programs</h3>
            {programs.map((p, i) => (
              <Card
                key={i}
                className="mb-2.5"
                style={{
                  border: p.featured
                    ? "1.5px solid rgba(13,148,136,.15)"
                    : "1px solid var(--border)",
                }}
              >
                <div style={{ padding: "12px 14px" }}>
                  <div className="flex gap-1.5 mb-1">
                    <Badge text={p.cred} color="var(--blue)" bg="var(--blue-soft)" small />
                    {p.featured && (
                      <Badge text="&#11088; Featured" color="var(--gold)" bg="var(--gold-soft)" small />
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-text mt-1 mb-1">{p.name}</h4>
                  <span className="text-xs text-text-sec">&#9201;&#65039; {p.dur}</span>
                </div>
              </Card>
            ))}

            <h3 className="text-lg font-bold text-text mt-5 mb-3">Open Positions</h3>
            {openPositions.map((j, i) => (
              <Card key={i} className="mb-2.5">
                <div style={{ padding: "12px 14px" }}>
                  <Badge text="Job" color="var(--blue)" bg="var(--blue-soft)" small />
                  <p className="text-sm font-bold text-text mt-1 mb-0">{j}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
