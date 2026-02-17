"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import { useOnboarding } from "@/lib/onboarding-context";

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

  const handleRestartTour = () => {
    router.push("/feed");
    // Small delay so the feed page mounts before tour starts
    setTimeout(() => resetTour(), 300);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <div className="max-w-[700px] mx-auto px-4 py-8 md:px-10">
          <Link
            href="/profile"
            className="text-sm text-teal font-semibold no-underline hover:underline mb-4 inline-block"
          >
            &larr; Back to Profile
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
      </div>
    </ProtectedRoute>
  );
}
