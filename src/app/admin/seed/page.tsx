"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { setOrganization } from "@/lib/firestore/organizations";
import { setPost } from "@/lib/firestore/posts";
import { serverTimestamp } from "firebase/firestore";

const orgs = [
  {
    id: "siga",
    name: "Saskatchewan Indian Gaming Authority",
    shortName: "SIGA",
    type: "employer" as const,
    tier: "premium" as const,
    location: "Saskatoon, SK",
    website: "siga.ca",
    description:
      "SIGA operates seven casinos across Saskatchewan, employing over 4,000 people. As the province's largest employer of Indigenous people, SIGA is committed to Indigenous economic self-sufficiency.",
    openJobs: 12,
    employees: "4,000+",
    since: "2023",
    verified: true,
    tags: ["Indigenous-Owned", "Gaming", "Hospitality"],
  },
  {
    id: "stc",
    name: "Saskatoon Tribal Council",
    shortName: "STC",
    type: "employer" as const,
    tier: "premium" as const,
    location: "Saskatoon, SK",
    website: "sktc.sk.ca",
    description:
      "Delivering services across seven member First Nations including health, education, and employment.",
    openJobs: 8,
    employees: "500+",
    since: "2023",
    verified: true,
    tags: ["First Nations", "Social Services", "Health"],
  },
  {
    id: "fnuniv",
    name: "First Nations University of Canada",
    shortName: "FNUniv",
    type: "school" as const,
    tier: "school" as const,
    location: "Regina, SK",
    website: "fnuniv.ca",
    description:
      "First Nations-controlled university with a mandate to enhance the quality of life and preserve the history, language, culture, and artistic heritage of First Nations peoples.",
    openJobs: 3,
    employees: "200+",
    since: "2024",
    verified: true,
    tags: ["Indigenous-Owned", "University", "Education"],
  },
  {
    id: "sask-polytech",
    name: "Saskatchewan Polytechnic",
    shortName: "SP",
    type: "school" as const,
    tier: "school" as const,
    location: "Saskatoon, SK",
    website: "saskpolytech.ca",
    description:
      "Leading polytechnic in Saskatchewan offering diploma and certificate programs with strong Indigenous student support services.",
    openJobs: 3,
    employees: "1,500+",
    since: "2024",
    verified: true,
    tags: ["Education", "Polytechnic", "Training"],
  },
  {
    id: "westland",
    name: "Westland Corp",
    shortName: "WC",
    type: "employer" as const,
    tier: "premium" as const,
    location: "Saskatoon, SK",
    description: "Construction and infrastructure services across Saskatchewan.",
    openJobs: 6,
    employees: "300+",
    since: "2025",
    verified: true,
    tags: ["Construction", "Infrastructure"],
  },
];

const posts = [
  {
    id: "job-executive-director-siga",
    type: "job" as const,
    title: "Executive Director",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    salary: "$95K - $120K",
    jobType: "Full-time",
    deadline: "Mar 15, 2026",
    featured: true,
    closingSoon: true,
    badges: ["Featured", "Closing Soon"],
    order: 1,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-health-nurse-stc",
    type: "job" as const,
    title: "Community Health Nurse",
    orgId: "stc",
    orgName: "Saskatoon Tribal Council",
    orgShort: "STC",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    source: "via STC Careers",
    badges: ["Verified"],
    order: 2,
    createdAt: serverTimestamp(),
  },
  {
    id: "program-indigenous-business-fnuniv",
    type: "program" as const,
    title: "Indigenous Business Administration",
    orgId: "fnuniv",
    orgName: "First Nations University of Canada",
    orgShort: "FNUniv",
    location: "Regina, SK",
    duration: "4 Years",
    credential: "Bachelor's Degree",
    badges: ["Education Partner"],
    order: 3,
    createdAt: serverTimestamp(),
  },
  {
    id: "spotlight-siga",
    type: "spotlight" as const,
    title: "Saskatchewan Indian Gaming Authority",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    description:
      "Leading Indigenous employer in Saskatchewan with 12 open positions across 7 casino properties",
    order: 4,
    createdAt: serverTimestamp(),
  },
  {
    id: "event-batoche",
    type: "event" as const,
    title: "Back to Batoche Days",
    location: "Batoche, SK",
    dates: "Jul 18-20",
    price: "Free",
    eventType: "Pow Wow",
    order: 5,
    createdAt: serverTimestamp(),
  },
  {
    id: "story-sarah",
    type: "story" as const,
    title: "Sarah Whitebear",
    community: "Muskoday First Nation",
    quote: "Every step I took was for my community.",
    order: 6,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-youth-coordinator-mltc",
    type: "job" as const,
    title: "Youth Program Coordinator",
    orgName: "Meadow Lake Tribal Council",
    orgShort: "MLTC",
    location: "Meadow Lake, SK",
    jobType: "Contract",
    order: 7,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-surveillance-siga",
    type: "job" as const,
    title: "Surveillance Officer",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    order: 8,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-table-games-siga",
    type: "job" as const,
    title: "Table Games Dealer",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Prince Albert, SK",
    jobType: "Full-time",
    order: 9,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-fb-manager-siga",
    type: "job" as const,
    title: "Food & Beverage Manager",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    order: 10,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-it-support-siga",
    type: "job" as const,
    title: "IT Support Analyst",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Regina, SK",
    salary: "$55K - $65K",
    jobType: "Full-time",
    order: 11,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-marketing-siga",
    type: "job" as const,
    title: "Marketing Coordinator",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    order: 12,
    createdAt: serverTimestamp(),
  },
  {
    id: "event-career-fair",
    type: "event" as const,
    title: "Treaty 6 Career Fair",
    location: "Saskatoon, SK",
    dates: "Aug 5",
    price: "Free",
    eventType: "Career Fair",
    order: 13,
    createdAt: serverTimestamp(),
  },
  {
    id: "event-round-dance",
    type: "event" as const,
    title: "Round Dance",
    location: "Prince Albert, SK",
    dates: "Mar 22",
    price: "Free",
    eventType: "Round Dance",
    order: 14,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-instructor-fnuniv",
    type: "job" as const,
    title: "Indigenous Studies Instructor",
    orgId: "fnuniv",
    orgName: "First Nations University of Canada",
    orgShort: "FNUniv",
    location: "Regina, SK",
    jobType: "Full-time",
    order: 15,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-recruitment-fnuniv",
    type: "job" as const,
    title: "Student Recruitment Coordinator",
    orgId: "fnuniv",
    orgName: "First Nations University of Canada",
    orgShort: "FNUniv",
    location: "Regina, SK",
    jobType: "Full-time",
    order: 16,
    createdAt: serverTimestamp(),
  },
];

export default function SeedPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <SeedContent />
      </div>
    </ProtectedRoute>
  );
}

function SeedContent() {
  const [status, setStatus] = useState("");
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    setStatus("Seeding organizations...");
    try {
      for (const org of orgs) {
        const { id, ...data } = org;
        await setOrganization(id, data);
      }
      setStatus(`Seeded ${orgs.length} organizations. Seeding posts...`);

      for (const post of posts) {
        const { id, ...data } = post;
        await setPost(id, data);
      }
      setStatus(
        `Done! Seeded ${orgs.length} organizations and ${posts.length} posts.`
      );
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8">
      <h2 className="text-2xl font-extrabold text-text mb-2">Seed Database</h2>
      <p className="text-sm text-text-sec mb-6">
        Populate Firestore with demo organizations and posts.
      </p>

      <Card style={{ padding: 20 }}>
        <p className="text-sm text-text-sec mb-1">
          <strong>{orgs.length}</strong> organizations &bull;{" "}
          <strong>{posts.length}</strong> posts
        </p>
        <p className="text-xs text-text-muted mb-4">
          This will overwrite existing documents with the same IDs.
        </p>

        <Button
          primary
          onClick={handleSeed}
          style={{
            background: "var(--teal)",
            borderRadius: 14,
            padding: "12px 24px",
            opacity: seeding ? 0.7 : 1,
          }}
        >
          {seeding ? "Seeding..." : "Seed Database"}
        </Button>

        {status && (
          <p className="text-sm text-teal mt-4 font-medium">{status}</p>
        )}
      </Card>
    </div>
  );
}
