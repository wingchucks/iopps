"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import Card from "@/components/Card";
import PageSkeleton from "@/components/PageSkeleton";
import { useOnboarding } from "@/lib/onboarding-context";
import { useAccountContext } from "@/lib/useAccountContext";

const memberSettingsLinks = [
  {
    href: "/settings/career",
    icon: "\u{1F4BC}",
    title: "Career Preferences",
    desc: "Set your open-to-work status, target roles, skills, and education",
  },
  {
    href: "/settings/privacy",
    icon: "\u{1F512}",
    title: "Privacy & Visibility",
    desc: "Control who can see your profile and information",
  },
  {
    href: "/settings/notifications",
    icon: "\u{1F514}",
    title: "Notifications",
    desc: "Manage email, push, and in-app notification preferences",
  },
  {
    href: "/settings/account",
    icon: "\u{1F464}",
    title: "Account",
    desc: "Update your display name, email, and manage your account",
  },
];

const employerSettingsLinks = [
  {
    href: "/org/dashboard?tab=Edit%20Profile&section=Identity",
    icon: "\u{1F3E2}",
    title: "Organization Profile",
    desc: "Update your public business profile, branding, and contact details",
  },
  {
    href: "/org/dashboard/billing",
    icon: "\u{1F4B3}",
    title: "Plan & Billing",
    desc: "Manage your plan, promotion options, and featured posting access",
  },
  {
    href: "/org/dashboard/team",
    icon: "\u{1F465}",
    title: "Team Access",
    desc: "Manage teammates and who can access your organization dashboard",
  },
  {
    href: "/settings/notifications",
    icon: "\u{1F514}",
    title: "Notifications",
    desc: "Manage employer alerts for applications, messages, and posting activity",
  },
  {
    href: "/settings/account",
    icon: "\u{1F464}",
    title: "Account",
    desc: "Update your display name, email, password, and account security",
  },
];

export default function SettingsPage() {
  const { resetTour } = useOnboarding();
  const router = useRouter();
  const { loading, hasOrg, isEmployer } = useAccountContext();

  const handleRestartTour = () => {
    router.push("/feed");
    // Small delay so the feed page mounts before tour starts
    setTimeout(() => resetTour(), 300);
  };

  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg flex flex-col">
        <div className="max-w-[700px] mx-auto px-4 py-8 md:px-10 flex-1">
          {loading ? (
            <PageSkeleton variant="list" />
          ) : (
            <>
          <Link
            href={isEmployer ? "/org/dashboard" : hasOrg ? "/org/dashboard" : "/profile"}
            className="text-sm text-teal font-semibold no-underline hover:underline mb-4 inline-block"
          >
            &larr; {isEmployer || hasOrg ? "Back to Dashboard" : "Back to Profile"}
          </Link>
          <h1 className="text-2xl font-extrabold text-text mb-1">
            {isEmployer ? "Employer Settings" : "Settings"}
          </h1>
          <p className="text-sm text-text-muted mb-6">
            {isEmployer
              ? "Manage your organization profile, plan, account access, and employer notifications."
              : "Manage your privacy, notifications, and account preferences."}
          </p>

          <div className="flex flex-col gap-3">
            {(isEmployer ? employerSettingsLinks : memberSettingsLinks).map(({ href, icon, title, desc }) => (
              <Link key={href} href={href} className="no-underline">
                <Card
                  className="hover:border-teal/30 transition-colors"
                >
                  <div className="flex items-center gap-4 p-4">
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1">
                      <h3 className="text-[15px] font-bold text-text mb-0.5">
                        {title}
                      </h3>
                      <p className="text-sm text-text-muted m-0">{desc}</p>
                    </div>
                    <span className="text-text-muted text-lg">&rsaquo;</span>
                  </div>
                </Card>
              </Link>
            ))}

            {/* Upgrade to Org — only for community members */}
            {!hasOrg && !isEmployer && (
              <Link href="/org/upgrade" className="no-underline">
                <Card className="hover:border-teal/30 transition-colors border-dashed">
                  <div className="flex items-center gap-4 p-4">
                    <span className="text-2xl">🏢</span>
                    <div className="flex-1">
                      <h3 className="text-[15px] font-bold text-text mb-0.5">
                        Set Up an Organization Page
                      </h3>
                      <p className="text-sm text-text-muted m-0">
                        Post jobs, list events, and showcase your organization on IOPPS
                      </p>
                    </div>
                    <span className="text-text-muted text-lg">&rsaquo;</span>
                  </div>
                </Card>
              </Link>
            )}

            {/* Restart Tour */}
            <Card className="hover:border-teal/30 transition-colors">
              <button
                onClick={handleRestartTour}
                className="flex items-center gap-4 p-4 w-full bg-transparent border-none cursor-pointer text-left"
              >
                <span className="text-2xl">&#127919;</span>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-text mb-0.5">
                    Restart Tour
                  </h3>
                  <p className="text-sm text-text-muted m-0">
                    Replay the onboarding walkthrough to rediscover features
                  </p>
                </div>
                <span className="text-text-muted text-lg">&rsaquo;</span>
              </button>
            </Card>
          </div>
          </>
          )}
        </div>
        <Footer />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}
