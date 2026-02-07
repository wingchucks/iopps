"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WelcomeWizardProps {
  onComplete: () => void;
  organizationName?: string;
}

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to IOPPS!",
    icon: "👋",
  },
  {
    id: "profile",
    title: "Complete Your Profile",
    icon: "📝",
  },
  {
    id: "approval",
    title: "Approval Process",
    icon: "✅",
  },
  {
    id: "next-steps",
    title: "What's Next",
    icon: "🚀",
  },
];

export default function WelcomeWizard({
  onComplete,
  organizationName,
}: WelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-accent/20">
              <span className="text-5xl">👋</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Welcome{organizationName ? `, ${organizationName}` : ""}!
            </h2>
            <p className="mt-4 text-[var(--text-secondary)]">
              You've taken the first step to connect with Indigenous talent across Canada.
              Let's get your organization set up on IOPPS.
            </p>
            <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <div className="mb-2 text-2xl">💼</div>
                <h4 className="font-semibold text-white">Post Jobs</h4>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Share employment opportunities with qualified Indigenous candidates
                </p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <div className="mb-2 text-2xl">🎪</div>
                <h4 className="font-semibold text-white">List Events</h4>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Promote pow wows, conferences, and community gatherings
                </p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <div className="mb-2 text-2xl">🔍</div>
                <h4 className="font-semibold text-white">Find Talent</h4>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Search and connect with skilled Indigenous professionals
                </p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="text-center">
            <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-blue-500/20">
              <span className="text-5xl">📝</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Complete Your Profile
            </h2>
            <p className="mt-4 text-[var(--text-secondary)]">
              A complete profile helps candidates learn about your organization and builds trust.
            </p>
            <div className="mt-8 space-y-4 text-left">
              <div className="flex items-start gap-4 rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-lg">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-white">Upload Your Logo</h4>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Add your organization's logo to stand out and be recognized
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-lg">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-white">Add a Description</h4>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Tell candidates about your mission, values, and what makes you unique
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-lg">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-white">Set Your Location</h4>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Help candidates find opportunities in their preferred region
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/20">
              <span className="text-5xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Quick Approval Process
            </h2>
            <p className="mt-4 text-[var(--text-secondary)]">
              To maintain a safe community, all employer profiles are reviewed before going live.
            </p>
            <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-left">
              <h4 className="font-semibold text-amber-300">What to expect:</h4>
              <ul className="mt-4 space-y-3 text-sm text-amber-200/80">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0">⏱️</span>
                  <span>Reviews are typically completed within <strong>1-2 business days</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0">📧</span>
                  <span>You'll receive an email notification once approved</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0">👁️</span>
                  <span>You can preview your profile while waiting for approval</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0">💼</span>
                  <span>Once approved, you can immediately start posting jobs</span>
                </li>
              </ul>
            </div>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Complete profiles with logos and descriptions are typically approved faster.
            </p>
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-accent/20">
              <span className="text-5xl">🚀</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              You're All Set!
            </h2>
            <p className="mt-4 text-[var(--text-secondary)]">
              Here's what you can do right now to get started:
            </p>
            <div className="mt-8 space-y-4">
              <Link
                href="/organization/dashboard?tab=profile"
                className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 p-4 transition-colors hover:bg-accent/20"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-xl">
                    ⚙️
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-white">Complete Your Profile</h4>
                    <p className="text-sm text-[var(--text-muted)]">Add logo, description, and details</p>
                  </div>
                </div>
                <span className="text-accent">→</span>
              </Link>
              <Link
                href="/organization/jobs/new"
                className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-surface p-4 transition-colors hover:bg-surface"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-xl">
                    💼
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-white">Draft Your First Job</h4>
                    <p className="text-sm text-[var(--text-muted)]">Ready to post once approved</p>
                  </div>
                </div>
                <span className="text-[var(--text-muted)]">→</span>
              </Link>
              <Link
                href="/organization/talent"
                className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-surface p-4 transition-colors hover:bg-surface"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-xl">
                    🔍
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-white">Browse Talent Pool</h4>
                    <p className="text-sm text-[var(--text-muted)]">Discover Indigenous professionals</p>
                  </div>
                </div>
                <span className="text-[var(--text-muted)]">→</span>
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`relative w-full max-w-2xl rounded-3xl border border-[var(--card-border)] bg-surface p-8 shadow-2xl transition-transform duration-300 ${
          isVisible ? "scale-100" : "scale-95"
        }`}
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute right-6 top-6 text-sm text-[var(--text-muted)] hover:text-white transition-colors"
        >
          Skip
        </button>

        {/* Progress indicators */}
        <div className="mb-8 flex justify-center gap-2">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all ${
                index === currentStep
                  ? "bg-accent text-white"
                  : index < currentStep
                  ? "bg-accent/20 text-accent"
                  : "bg-surface text-foreground0"
              }`}
            >
              {index < currentStep ? "✓" : step.icon}
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">{renderStepContent()}</div>

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`rounded-lg px-6 py-3 font-medium transition-colors ${
              currentStep === 0
                ? "invisible"
                : "text-[var(--text-muted)] hover:text-white"
            }`}
          >
            ← Back
          </button>

          <button
            onClick={handleNext}
            className="rounded-lg bg-accent px-8 py-3 font-semibold text-white transition-colors hover:bg-accent"
          >
            {currentStep === STEPS.length - 1 ? "Get Started" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
