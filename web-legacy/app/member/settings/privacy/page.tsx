"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import PrivacySettings from "@/components/PrivacySettings";
import { ArrowLeft } from "lucide-react";

function PrivacySettingsContent() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        {/* Back nav */}
        <Link
          href="/member/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[#14B8A6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Privacy & Visibility
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Control who can see your profile and how you appear on the platform
          </p>
        </div>

        <PrivacySettings />
      </div>
    </div>
  );
}

export default function PrivacySettingsPage() {
  return (
    <ProtectedRoute>
      <PrivacySettingsContent />
    </ProtectedRoute>
  );
}
