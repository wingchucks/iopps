"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotificationSettings from "@/components/NotificationSettings";
import { ArrowLeft } from "lucide-react";

function NotificationPreferencesContent() {
  return (
    <div className="min-h-screen bg-[#020306]">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        {/* Back nav */}
        <Link
          href="/member/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#14B8A6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">
            Notification Preferences
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Control how and when you receive notifications
          </p>
        </div>

        <NotificationSettings />
      </div>
    </div>
  );
}

export default function NotificationPreferencesPage() {
  return (
    <ProtectedRoute>
      <NotificationPreferencesContent />
    </ProtectedRoute>
  );
}
