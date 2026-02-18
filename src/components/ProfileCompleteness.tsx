"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile, type MemberProfile } from "@/lib/firestore/members";

interface Step {
  label: string;
  done: boolean;
  link: string;
}

function getSteps(profile: MemberProfile | null, hasPhoto: boolean): Step[] {
  return [
    {
      label: "Add your community",
      done: !!profile?.community,
      link: "/profile",
    },
    {
      label: "Set your location",
      done: !!profile?.location,
      link: "/profile",
    },
    {
      label: "Write a bio",
      done: !!profile?.bio,
      link: "/profile",
    },
    {
      label: "Choose your interests",
      done: (profile?.interests?.length ?? 0) > 0,
      link: "/setup",
    },
    {
      label: "Upload a profile photo",
      done: hasPhoto,
      link: "/profile",
    },
  ];
}

export default function ProfileCompleteness() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check if user has dismissed the banner this session
    const key = `iopps-profile-banner-${user.uid}`;
    if (sessionStorage.getItem(key) === "dismissed") {
      setDismissed(true);
      setLoaded(true);
      return;
    }
    getMemberProfile(user.uid)
      .then((data) => {
        setProfile(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user]);

  if (!loaded || dismissed) return null;

  const steps = getSteps(profile, !!profile?.photoURL);
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);

  // Don't show if profile is complete
  if (pct === 100) return null;

  const nextStep = steps.find((s) => !s.done);

  const handleDismiss = () => {
    if (user) {
      sessionStorage.setItem(`iopps-profile-banner-${user.uid}`, "dismissed");
    }
    setDismissed(true);
  };

  return (
    <div
      className="rounded-2xl mb-4 relative overflow-hidden"
      style={{
        padding: "16px 20px",
        background: "linear-gradient(135deg, var(--teal-soft), var(--blue-soft))",
        border: "1.5px solid color-mix(in srgb, var(--teal) 15%, transparent)",
      }}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 w-6 h-6 rounded-full border-none cursor-pointer text-text-muted text-sm flex items-center justify-center hover:bg-border/40 bg-transparent"
        aria-label="Dismiss profile completeness banner"
      >
        &times;
      </button>

      <div className="flex items-center gap-3 mb-2.5">
        <span className="text-xl">&#127919;</span>
        <div>
          <p className="text-sm font-bold text-text m-0">
            Complete your profile — {pct}%
          </p>
          <p className="text-xs text-text-sec m-0">
            {completed}/{total} steps done
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full mb-3"
        style={{ background: "color-mix(in srgb, var(--border) 60%, transparent)" }}
      >
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--teal), var(--blue))",
          }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
              style={{
                fontSize: 9,
                fontWeight: 700,
                background: step.done ? "var(--teal)" : "var(--border)",
              }}
            >
              {step.done ? "\u2713" : ""}
            </span>
            <span
              className="text-xs"
              style={{
                color: step.done ? "var(--text-muted)" : "var(--text-sec)",
                textDecoration: step.done ? "line-through" : "none",
              }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {nextStep && (
        <Link
          href={nextStep.link}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white no-underline"
          style={{ background: "var(--teal)" }}
        >
          {nextStep.label} &rarr;
        </Link>
      )}
    </div>
  );
}
