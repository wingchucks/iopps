"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = use(searchParams);
  const router = useRouter();

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="min-h-screen bg-bg flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <div className="p-8 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--green-soft)" }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-text mb-2">
                Payment Successful!
              </h1>
              <p className="text-sm text-text-sec mb-6">
                Your subscription has been activated. You&apos;ll receive a
                confirmation email shortly.
              </p>

              {params.session_id && (
                <p className="text-xs text-text-muted mb-4">
                  Reference: {params.session_id.slice(0, 20)}...
                </p>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push("/org/dashboard")}
                  className="w-full py-3 rounded-xl border-none font-semibold text-base cursor-pointer transition-all hover:opacity-90"
                  style={{ background: "var(--navy)", color: "#fff" }}
                >
                  Go to Dashboard
                </button>
                <Link
                  href="/org/plans"
                  className="text-sm text-teal no-underline hover:underline"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
