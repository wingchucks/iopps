"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getOrganizationByOwner } from "@/lib/firestore/v2-organizations";
import type { V2Organization } from "@/lib/firestore/v2-types";

function RejectedContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [org, setOrg] = useState<V2Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const found = await getOrganizationByOwner(user.uid);
      if (!found) {
        router.replace("/organization/dashboard");
        return;
      }
      if (found.status === "active") {
        router.replace("/org/dashboard");
        return;
      }
      if (found.status === "pending") {
        router.replace("/org/pending");
        return;
      }
      setOrg(found);
      setLoading(false);
    })();
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Error Banner */}
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 mb-4">
            <svg className="h-7 w-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-red-700 dark:text-red-300">Your application was not approved</h1>

          {org.rejectReason && (
            <div className="mt-4 rounded-xl bg-red-500/10 p-4 text-left">
              <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Reason</p>
              <p className="text-sm text-red-700 dark:text-red-300">{org.rejectReason}</p>
            </div>
          )}

          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            If you believe this was a mistake or would like more information, please contact our support team.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:support@iopps.ca"
            className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-6 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface)] transition"
          >
            Contact Support
          </a>
          <button
            onClick={() => router.push("/org/pending")}
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            Edit &amp; Resubmit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrgRejectedPage() {
  return (
    <ProtectedRoute allowedRoles={["employer"]}>
      <RejectedContent />
    </ProtectedRoute>
  );
}
