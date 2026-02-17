"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Link from "next/link";

const tabs = ["All", "Jobs", "Events", "Scholarships", "Businesses", "Schools", "Livestreams", "Stories"];

const hiringOrgs = [
  { name: "SIGA", count: 12, color: "var(--navy)" },
  { name: "STC", count: 8, color: "var(--teal)" },
  { name: "Sask Polytech", count: 5, color: "var(--blue)" },
  { name: "FNUniv", count: 3, color: "var(--purple)" },
  { name: "Westland", count: 6, color: "var(--green)" },
];

export default function FeedPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <FeedContent />
      </div>
    </ProtectedRoute>
  );
}

function FeedContent() {
  const [tab, setTab] = useState("All");
  const { user, signOut } = useAuth();
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";

  return (
    <div className="flex gap-6 max-w-[1200px] mx-auto px-4 py-4 md:px-10 md:py-6">
      {/* ═══ Left Sidebar ═══ */}
      <div className="hidden lg:block w-[260px] shrink-0">
        {/* Profile card */}
        <Card className="mb-4" style={{ padding: 20 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <Avatar name={displayName} size={44} />
            <div>
              <p className="text-[15px] font-bold text-text m-0">{displayName}</p>
              <p className="text-xs text-teal-light m-0">Community Member</p>
            </div>
          </div>
          <Button small full onClick={signOut} style={{ fontSize: 12 }}>
            Sign Out
          </Button>
        </Card>

        {/* Featured Partners */}
        <Card className="mb-4">
          <div className="border-b border-border" style={{ padding: "14px 16px" }}>
            <p className="text-xs font-bold text-text-muted m-0 tracking-[1px]">FEATURED PARTNERS</p>
          </div>
          {[
            { name: "SIGA", full: "Saskatchewan Indian Gaming Authority", jobs: 12, badge: "premium" },
            { name: "Sask Polytech", full: "Saskatchewan Polytechnic", jobs: 5, badge: "school" },
            { name: "STC", full: "Saskatoon Tribal Council", jobs: 8, badge: "premium" },
          ].map((p, i, arr) => (
            <div
              key={i}
              className="flex gap-2.5 items-center cursor-pointer"
              style={{
                padding: "10px 16px",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <Avatar
                name={p.name}
                size={32}
                gradient={p.badge === "school" ? "linear-gradient(135deg, var(--teal), var(--blue))" : undefined}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {p.full}
                </p>
                <p className="text-[11px] text-teal m-0">{p.jobs} open roles</p>
              </div>
            </div>
          ))}
          <div style={{ padding: "10px 16px" }}>
            <span className="text-xs text-teal font-semibold cursor-pointer">View all partners →</span>
          </div>
        </Card>

        {/* Closing Soon */}
        <Card className="mb-4">
          <div className="border-b border-border" style={{ padding: "14px 16px" }}>
            <p className="text-xs font-bold text-red m-0 tracking-[1px]">&#9200; CLOSING SOON</p>
          </div>
          {["Executive Director — SIGA", "Health Nurse — STC", "Bursary — FNUniv"].map((j, i) => (
            <div
              key={i}
              className="cursor-pointer"
              style={{
                padding: "10px 16px",
                borderBottom: i < 2 ? "1px solid var(--border)" : "none",
              }}
            >
              <p className="text-xs font-semibold text-text m-0">{j}</p>
              <p className="text-[11px] text-red m-0">{3 + i} days left</p>
            </div>
          ))}
        </Card>

        {/* Upcoming Events */}
        <Card>
          <div className="border-b border-border" style={{ padding: "14px 16px" }}>
            <p className="text-xs font-bold text-text-muted m-0 tracking-[1px]">UPCOMING EVENTS</p>
          </div>
          {["Back to Batoche Days — Jul 18", "Treaty 6 Career Fair — Aug 5", "Round Dance — Mar 22"].map((e, i) => (
            <div
              key={i}
              className="cursor-pointer"
              style={{
                padding: "10px 16px",
                borderBottom: i < 2 ? "1px solid var(--border)" : "none",
              }}
            >
              <p className="text-xs font-semibold text-text m-0">{e}</p>
            </div>
          ))}
        </Card>
      </div>

      {/* ═══ Center Feed ═══ */}
      <div className="flex-1 max-w-full lg:max-w-[580px] min-w-0">
        {/* LIVE banner */}
        <div
          className="flex items-center gap-3 rounded-[14px] mb-3 cursor-pointer"
          style={{
            padding: "12px 16px",
            background: "linear-gradient(135deg, var(--red), #991B1B)",
          }}
        >
          <span
            className="text-[11px] text-white font-bold rounded-full"
            style={{ background: "rgba(255,255,255,.2)", padding: "4px 12px" }}
          >
            ● LIVE
          </span>
          <span className="text-white text-sm font-semibold">IOPPS Spotlight: Interview with Chief Stone</span>
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,.7)" }}>Watch →</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 rounded-full border-none whitespace-nowrap font-semibold text-[13px] cursor-pointer transition-colors"
              style={{
                background: tab === t ? "var(--navy)" : "#E2E8F0",
                color: tab === t ? "#fff" : "var(--text-sec)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Hiring Now Carousel */}
        <div className="flex gap-2 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {hiringOrgs.map((org, i) => (
            <div
              key={i}
              className="flex-none flex items-center gap-2 rounded-xl cursor-pointer"
              style={{
                padding: "8px 14px",
                background: `color-mix(in srgb, ${org.color} 4%, transparent)`,
                border: `1.5px solid color-mix(in srgb, ${org.color} 8%, transparent)`,
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold"
                style={{
                  fontSize: 9,
                  background: `color-mix(in srgb, ${org.color} 8%, transparent)`,
                  color: org.color,
                }}
              >
                {org.name.slice(0, 2)}
              </div>
              <div>
                <p className="text-xs font-bold text-text m-0">{org.name}</p>
                <p className="m-0 font-semibold" style={{ fontSize: 10, color: org.color }}>
                  {org.count} open roles
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Feed Cards */}
        <div className="flex flex-col gap-3">
          {/* Featured Job */}
          <Card gold>
            <div style={{ padding: "16px 20px" }}>
              <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>&#11088;</span>} />
                <Badge text="Closing Soon" color="var(--red)" bg="var(--red-soft)" small />
              </div>
              <h3 className="text-[17px] font-bold text-text mb-2">Executive Director</h3>
              <div className="flex items-center gap-2.5 mb-2.5">
                <Avatar name="SIGA" size={32} gradient="linear-gradient(135deg, var(--navy), var(--teal))" />
                <div className="flex items-center gap-2">
                  <span className="text-[15px] text-teal font-bold">SIGA</span>
                  <Badge text="&#10003; Premium Partner" color="var(--gold)" bg="var(--gold-soft)" small />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-[13px] text-text-sec">
                <span>&#128205; Saskatoon, SK</span>
                <span>Full-time</span>
                <span>&#128176; $95K - $120K</span>
                <span>&#128197; Mar 15, 2026</span>
              </div>
            </div>
            <div
              className="flex justify-between items-center border-t border-border"
              style={{ padding: "10px 20px", background: "#FAFBFC" }}
            >
              <span className="text-xs text-text-muted cursor-pointer">&#128278; Save</span>
              <Link href="/jobs/executive-director-siga"><Button small primary>View Job →</Button></Link>
            </div>
          </Card>

          {/* Feed-synced job */}
          <Link href="/jobs/community-health-nurse-stc" className="no-underline">
            <Card>
              <div style={{ padding: "16px 20px" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge text="Job" color="var(--blue)" bg="var(--blue-soft)" small />
                  <span className="text-[11px] text-text-muted italic">via STC Careers</span>
                </div>
                <h3 className="text-base font-bold text-text mb-1.5">Community Health Nurse</h3>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-sm text-teal font-semibold">Saskatoon Tribal Council</span>
                  <Badge text="&#10003; Verified" color="var(--green)" bg="var(--green-soft)" small />
                </div>
                <div className="flex gap-3 text-[13px] text-text-sec">
                  <span>&#128205; Saskatoon, SK</span>
                  <span>Full-time</span>
                </div>
              </div>
            </Card>
          </Link>

          {/* School program */}
          <Card>
            <div style={{ padding: "16px 20px" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Badge text="Program" color="var(--blue)" bg="var(--blue-soft)" small icon={<span>&#128218;</span>} />
                <Badge text="&#127891; Education Partner" color="var(--teal)" bg="var(--teal-soft)" small />
              </div>
              <h3 className="text-base font-bold text-text mb-1.5">Indigenous Business Administration</h3>
              <span className="text-sm text-teal font-semibold">First Nations University of Canada</span>
              <div className="flex gap-3 text-[13px] text-text-sec mt-1.5">
                <span>&#128205; Regina, SK</span>
                <span>4 Years</span>
                <span>Bachelor&apos;s Degree</span>
              </div>
            </div>
          </Card>

          {/* Partner Spotlight */}
          <div
            className="rounded-2xl"
            style={{
              padding: 20,
              border: "1.5px solid rgba(217,119,6,.19)",
              background: "linear-gradient(135deg, var(--gold-soft), #FFFBEB)",
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <p className="text-[11px] font-bold text-gold tracking-[1px] m-0">PARTNER SPOTLIGHT</p>
              <p className="text-gold tracking-[1.5px] m-0 opacity-50" style={{ fontSize: 8, fontWeight: 800 }}>
                EMPOWERING INDIGENOUS SUCCESS
              </p>
            </div>
            <div className="flex gap-3.5 items-center">
              <Avatar name="SIGA" size={52} gradient="linear-gradient(135deg, rgba(217,119,6,.25), rgba(15,43,76,.19))" />
              <div>
                <h3 className="text-base font-bold text-text mb-1">Saskatchewan Indian Gaming Authority</h3>
                <p className="text-[13px] text-text-sec mb-2">
                  Leading Indigenous employer in Saskatchewan with 12 open positions across 7 casino properties
                </p>
                <Button small primary style={{ background: "var(--gold)", padding: "6px 14px", fontSize: 12 }}>
                  View Profile →
                </Button>
              </div>
            </div>
          </div>

          {/* Event */}
          <Link href="/events/back-to-batoche-days" className="no-underline">
            <Card>
              <div
                className="h-[100px] flex items-center justify-center text-5xl"
                style={{ background: "linear-gradient(135deg, rgba(15,43,76,.06), rgba(217,119,6,.06))" }}
              >
                &#129718;
              </div>
              <div style={{ padding: "14px 20px" }}>
                <Badge text="Pow Wow" color="var(--gold)" bg="var(--gold-soft)" small />
                <h3 className="text-base font-bold text-text mt-2 mb-1">Back to Batoche Days</h3>
                <div className="flex gap-3 text-[13px] text-text-sec">
                  <span>&#128197; Jul 18-20</span>
                  <span>&#128205; Batoche, SK</span>
                  <span>&#127915; Free</span>
                </div>
              </div>
            </Card>
          </Link>

          {/* Success Story */}
          <Card>
            <div style={{ padding: 20, background: "linear-gradient(135deg, rgba(5,150,105,.04), rgba(13,148,136,.03))" }}>
              <Badge text="&#127775; Success Story" color="var(--green)" bg="var(--green-soft)" small />
              <div className="flex gap-3.5 mt-3 items-center">
                <Avatar name="Sarah Whitebear" size={52} />
                <div>
                  <p className="text-base font-bold m-0 text-text">Sarah Whitebear</p>
                  <p className="text-xs text-teal font-semibold mt-0.5">Muskoday First Nation</p>
                </div>
              </div>
              <p className="text-[15px] font-semibold italic text-text mt-3.5 leading-relaxed">
                &quot;Every step I took was for my community.&quot;
              </p>
            </div>
          </Card>

          {/* Regular job */}
          <Link href="/jobs/youth-program-coordinator-mltc" className="no-underline">
            <Card>
              <div style={{ padding: "16px 20px" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge text="Job" color="var(--blue)" bg="var(--blue-soft)" small />
                </div>
                <h3 className="text-base font-bold text-text mb-1.5">Youth Program Coordinator</h3>
                <span className="text-sm text-teal font-semibold">Meadow Lake Tribal Council</span>
                <div className="flex gap-3 text-[13px] text-text-sec mt-1.5">
                  <span>&#128205; Meadow Lake, SK</span>
                  <span>Contract</span>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* ═══ Right Sidebar ═══ */}
      <div className="hidden xl:block w-[260px] shrink-0">
        {/* Your Applications */}
        <Card className="mb-4" style={{ padding: 16 }}>
          <p className="text-xs font-bold text-text-muted mb-2.5 tracking-[1px]">YOUR APPLICATIONS</p>
          {[
            { title: "Project Manager — STC", status: "Under Review", color: "var(--gold)" },
            { title: "IT Support — SIGA", status: "Viewed", color: "var(--blue)" },
          ].map((a, i) => (
            <div key={i} className="py-2" style={{ borderBottom: i < 1 ? "1px solid var(--border)" : "none" }}>
              <p className="text-xs font-semibold text-text mb-0.5">{a.title}</p>
              <Badge text={a.status} color={a.color} bg={`color-mix(in srgb, ${a.color} 8%, transparent)`} small />
            </div>
          ))}
        </Card>

        {/* Trending */}
        <Card className="mb-4" style={{ padding: 16 }}>
          <p className="text-xs font-bold text-text-muted mb-2.5 tracking-[1px]">TRENDING THIS WEEK</p>
          {["SIGA hiring surge: 12 new positions", "Treaty 6 Career Fair announced", "New nursing scholarship posted"].map(
            (t, i) => (
              <div key={i} className="py-2" style={{ borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                <p className="text-xs font-semibold text-text m-0">{t}</p>
              </div>
            )
          )}
        </Card>

        {/* Saved Items */}
        <Card style={{ padding: 16 }}>
          <p className="text-xs font-bold text-text-muted mb-2.5 tracking-[1px]">SAVED ITEMS</p>
          {["Executive Director — SIGA", "FNUniv Scholarship", "Back to Batoche Days"].map((s, i) => (
            <div key={i} className="py-2" style={{ borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
              <p className="text-xs font-semibold text-text m-0">&#128278; {s}</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
