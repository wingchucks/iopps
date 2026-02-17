"use client";

import type { Metadata } from "next";
import { useState } from "react";
import Link from "next/link";

// Note: metadata must be in a separate file or this page needs to be split
// For now, partners is client-side for filtering. Metadata via generateMetadata in a wrapper if needed.

type FilterType = "all" | "employers" | "schools" | "businesses";

// Placeholder data — will be replaced with Firestore queries
const partners = [
  { id: "1", name: "Northern Resource Corp", type: "employers" as const, tier: "tier2" as const, logo: null, description: "Leading employer in northern resource development with a commitment to Indigenous hiring.", location: "AB" },
  { id: "2", name: "Indigenous Technical Institute", type: "schools" as const, tier: "school" as const, logo: null, description: "Offering 20+ programs designed for Indigenous learners.", location: "ON", programs: ["Environmental Tech", "Business Admin", "Health Sciences"] },
  { id: "3", name: "Prairie Health Authority", type: "employers" as const, tier: "tier2" as const, logo: null, description: "Healthcare employer serving Indigenous communities across the prairies.", location: "SK" },
  { id: "4", name: "First Nations University", type: "schools" as const, tier: "school" as const, logo: null, description: "Canada's only First Nations-owned university.", location: "SK", programs: ["Indigenous Studies", "Social Work", "Education"] },
  { id: "5", name: "Indigenous Artisan Collective", type: "businesses" as const, tier: "tier2" as const, logo: null, description: "Collective of Indigenous artisans and craftspeople.", location: "BC" },
];

export default function PartnersPage() {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all" ? partners : partners.filter((p) => p.type === filter);

  return (
    <div>
      <section className="bg-hero-gradient text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Partners</h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Organizations committed to creating opportunities for Indigenous communities.
        </p>
      </section>

      <section className="py-12 px-4 max-w-5xl mx-auto">
        {/* Filters */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(["all", "employers", "schools", "businesses"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--accent-light)]"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Partner Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`border rounded-2xl p-6 bg-[var(--card-bg)] card-interactive ${
                p.tier === "school"
                  ? "border-[var(--teal)] sm:col-span-2 lg:col-span-1"
                  : "border-[var(--card-border)]"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-[var(--surface-raised)] flex items-center justify-center text-lg font-bold text-[var(--text-muted)]">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{p.name}</h3>
                  <div className="flex gap-2">
                    {p.tier === "school" && <span className="badge-education">Education Partner</span>}
                    {p.tier === "tier2" && <span className="badge-premium">Premium</span>}
                  </div>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3">{p.description}</p>
              {"programs" in p && p.programs && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.programs.map((prog) => (
                    <span key={prog} className="text-xs bg-[var(--accent-light)] text-[var(--accent)] px-2 py-0.5 rounded-full">
                      {prog}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)]">{p.location}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[var(--surface-raised)] py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Become a Partner</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Join the organizations making a difference in Indigenous communities.
        </p>
        <Link href="/pricing" className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-8 py-3 rounded-lg transition-colors">
          View Plans
        </Link>
      </section>
    </div>
  );
}
