"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DataExportSettings from "@/components/DataExportSettings";

function DataExportContent() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <Link
          href="/member/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[#14B8A6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-foreground">
          Export My Data
        </h1>

        <DataExportSettings />
      </div>
    </div>
  );
}

export default function DataExportPage() {
  return (
    <ProtectedRoute>
      <DataExportContent />
    </ProtectedRoute>
  );
}
