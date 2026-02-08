"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  BriefcaseIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  MagnifyingGlassIcon,
  StarIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

type StepCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  primary?: boolean;
};

const employerSteps: StepCard[] = [
  {
    title: "Post First Job",
    description: "Create a job listing and start reaching qualified Indigenous candidates.",
    href: "/organization/hire/jobs/new",
    icon: BriefcaseIcon,
    primary: true,
  },
  {
    title: "Complete Profile",
    description: "Add your organization details to build trust with applicants.",
    href: "/onboarding/organization",
    icon: BuildingOffice2Icon,
  },
  {
    title: "Explore Dashboard",
    description: "See your analytics, manage listings, and track applications.",
    href: "/organization",
    icon: SparklesIcon,
  },
];

const communitySteps: StepCard[] = [
  {
    title: "Discover Opportunities",
    description: "Browse jobs, scholarships, conferences, and more across Canada.",
    href: "/discover",
    icon: MagnifyingGlassIcon,
    primary: true,
  },
  {
    title: "Request Endorsements",
    description: "Ask colleagues and mentors to endorse your skills and experience.",
    href: "/member/endorsements",
    icon: StarIcon,
  },
  {
    title: "View Profile",
    description: "See how your profile looks to employers and community members.",
    href: "/member/profile",
    icon: UserCircleIcon,
  },
];

export default function WelcomePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  const steps = role === "employer" ? employerSteps : communitySteps;
  const displayName = user.displayName || "there";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* Minimal header */}
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-accent"
          >
            IOPPS
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-2xl text-center">
          {/* Animated checkmark */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-lt)] transition-transform duration-500 ease-out ${
                mounted ? "scale-100" : "scale-0"
              }`}
            >
              <svg
                className="h-10 w-10 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                  className={mounted ? "animate-check-draw" : ""}
                  style={{
                    strokeDasharray: 24,
                    strokeDashoffset: mounted ? 0 : 24,
                    transition: "stroke-dashoffset 0.5s ease-out 0.3s",
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Greeting */}
          <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Welcome, {displayName}!
          </h1>
          <p className="mt-2 text-foreground0">
            Your account is ready. Here&apos;s what to do next.
          </p>

          {/* Next-step cards */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <Link
                key={step.href}
                href={step.href}
                className={`group rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 text-left transition hover:shadow-md focus-within:shadow-md active:shadow-md ${
                  step.primary ? "border-l-4 border-l-teal-500" : ""
                }`}
              >
                <step.icon className="mb-3 h-6 w-6 text-accent" />
                <h2 className="font-semibold text-[var(--text-primary)]">{step.title}</h2>
                <p className="mt-1 text-sm text-foreground0">
                  {step.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
