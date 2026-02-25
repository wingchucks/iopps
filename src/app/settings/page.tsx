"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import Card from "@/components/Card";
import { useOnboarding } from "@/lib/onboarding-context";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";

const settingsLinks = [
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

export default function SettingsPage() {
  const { resetTour } = useOnboarding();
  const router = useRouter();
  const { user } = useAuth();
  const [hasOrg, setHasOrg] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMemberProfile(user.uid).then((p) => { if (p?.orgId) setHasOrg(true); });
  }, [user]);

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
          <Link
            href={hasOrg ? "/org/dashboard" : "/profile"}
            className="text-sm text-teal font-semibold no-underline hover:underline mb-4 inline-block"
          >
            &larr; {hasOrg ? "Back to Dashboard" : "Back to Profile"}
          </Link>
          <h1 className="text-2xl font-extrabold text-text mb-1">Settings</h1>
          <p className="text-sm text-text-muted mb-6">
            Manage your privacy, notifications, and account preferences.
          </p>

          <div className="flex flex-col gap-3">
            {settingsLinks.map(({ href, icon, title, desc }) => (
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
            {!hasOrg && (
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
        </div>
        <Footer />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}
