"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";

const settingsLinks = [
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
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
