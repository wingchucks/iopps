"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";

export default function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
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
                style={{ background: "var(--amber-soft, #fef3c7)" }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--amber, #f59e0b)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-text mb-2">
                Payment Cancelled
              </h1>
              <p className="text-sm text-text-sec mb-6">
                Your payment was not processed. No charges have been made to
                your account.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() =>
                    router.push(
                      `/org/checkout${params.plan ? `?plan=${params.plan}` : ""}`
                    )
                  }
                  className="w-full py-3 rounded-xl border-none font-semibold text-base cursor-pointer transition-all hover:opacity-90"
                  style={{ background: "var(--navy)", color: "#fff" }}
                >
                  Try Again
                </button>
                <Link
                  href="/org/plans"
                  className="text-sm text-teal no-underline hover:underline"
                >
                  Back to Plans
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
