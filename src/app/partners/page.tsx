"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Link from "next/link";

const filters = ["All", "Employers", "Schools", "Businesses"];

const orgs = [
  { name: "Saskatchewan Indian Gaming Authority", short: "SIGA", loc: "Saskatoon, SK", jobs: 12, desc: "Saskatchewan's largest employer of Indigenous people", since: "2023" },
  { name: "Saskatoon Tribal Council", short: "STC", loc: "Saskatoon, SK", jobs: 8, desc: "Delivering services across seven member First Nations", since: "2023" },
  { name: "Westland Corp", short: "WC", loc: "Saskatoon, SK", jobs: 6, desc: "Construction and infrastructure services", since: "2025" },
  { name: "First Nations University", short: "FNUniv", loc: "Regina, SK", jobs: 3, desc: "First Nations-controlled university", since: "2024" },
];

export default function PartnersPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <PartnersContent />
      </div>
    </ProtectedRoute>
  );
}

function PartnersContent() {
  const [filter, setFilter] = useState("All");

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-[28px] font-extrabold text-text mb-1">Organizations on IOPPS</h2>
        <p className="text-[15px] text-text-sec mb-1">
          Employers and schools investing in Indigenous talent
        </p>
        <p className="text-teal m-0" style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3 }}>
          EMPOWERING INDIGENOUS SUCCESS
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-5 py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-colors"
            style={{
              border: filter === f ? "none" : "1.5px solid var(--border)",
              background: filter === f ? "var(--navy)" : "#fff",
              color: filter === f ? "#fff" : "var(--text-sec)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Featured School Card */}
      <Card className="mb-5" style={{ border: "2px solid rgba(13,148,136,.15)" }}>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-6">
          <Avatar
            name="SP"
            size={72}
            gradient="linear-gradient(135deg, var(--teal), var(--blue))"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="text-lg sm:text-xl font-extrabold text-text m-0">Saskatchewan Polytechnic</h3>
              <Badge text="&#127891; Education Partner" color="var(--teal)" bg="var(--teal-soft)" small />
              <Badge text="&#10003; Verified" color="var(--green)" bg="var(--green-soft)" small />
            </div>
            <p className="text-sm text-text-sec mb-3 leading-relaxed">
              Leading polytechnic in Saskatchewan offering diploma and certificate programs with strong Indigenous student support services.
            </p>
            <div className="flex flex-wrap gap-3 md:gap-5 text-[13px] text-text-sec mb-2.5">
              <span>&#128205; Saskatoon, SK</span>
              <span>&#128218; 5 active programs</span>
              <span>&#128188; 3 open jobs</span>
              <span>Since 2024</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {["Practical Nursing", "Business Diploma", "IT Networking"].map((p) => (
                <span
                  key={p}
                  className="rounded-lg text-xs text-teal font-semibold"
                  style={{ padding: "4px 12px", background: "rgba(13,148,136,.06)" }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <Link href="/schools/sask-polytech">
            <Button small primary style={{ alignSelf: "center" }}>View →</Button>
          </Link>
        </div>
      </Card>

      {/* Org Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {orgs.map((org, i) => (
          <Card key={i} className="cursor-pointer">
            <div style={{ padding: 20 }}>
              <div className="flex gap-3 items-center mb-2.5">
                <Avatar name={org.short} size={44} />
                <div>
                  <h3 className="text-[15px] font-bold text-text mb-1">{org.name}</h3>
                  <Badge text="&#10003; Premium Partner" color="var(--gold)" bg="var(--gold-soft)" small />
                </div>
              </div>
              <p className="text-[13px] text-text-sec mb-2">{org.desc}</p>
              <div className="flex gap-3 text-xs text-text-muted">
                <span>&#128205; {org.loc}</span>
                <span>&#128188; {org.jobs} open</span>
                <span>Since {org.since}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
