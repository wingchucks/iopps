"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, Button } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanCard {
  id: string;
  name: string;
  description: string;
  iconPath: string;
}

interface PaymentRecord {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MODULE_PLANS: PlanCard[] = [
  {
    id: "hire",
    name: "Hire",
    description: "Post jobs and find Indigenous talent across Canada.",
    iconPath:
      "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    id: "sell",
    name: "Sell",
    description: "Showcase products and services in the Indigenous marketplace.",
    iconPath:
      "M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72l1.189-1.19A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72M6.75 18h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z",
  },
  {
    id: "host",
    name: "Host",
    description: "Organize conferences, pow wows, and community events.",
    iconPath:
      "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  },
  {
    id: "educate",
    name: "Educate",
    description: "Offer scholarships and educational resources.",
    iconPath:
      "M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5",
  },
];

const PAYMENT_HISTORY: PaymentRecord[] = [];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-surface p-4 text-center">
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrganizationBillingPage() {
  const { userProfile } = useAuth();

  function handleManageBilling() {
    // TODO: Open Stripe customer portal
    console.log("TODO: Open Stripe customer portal");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
          Billing
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your subscription, credits, and payment history.
        </p>
      </div>

      {/* Subscription overview */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Subscription Overview
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                No active subscription
              </p>
            </div>
            <div className="flex gap-3">
              <Button href="/pricing" variant="primary">
                View Pricing Plans
              </Button>
              <Button
                variant="secondary"
                onClick={handleManageBilling}
              >
                Manage Billing
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBox label="Current Tier" value="Free" />
        <StatBox label="Job Credits" value={0} />
        <StatBox label="Featured Credits" value={0} />
      </div>

      {/* Module plans grid */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          Module Plans
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULE_PLANS.map((plan) => (
            <Card key={plan.id} className="card-hover">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={plan.iconPath}
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {plan.name}
                </h3>
                <p className="mt-1 text-xs text-text-muted leading-relaxed">
                  {plan.description}
                </p>
                <div className="mt-4">
                  <Button
                    href="/pricing"
                    variant="outline"
                    size="sm"
                    fullWidth
                  >
                    View Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment history */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            Payment History
          </h2>

          {PAYMENT_HISTORY.length === 0 ? (
            <div className="rounded-xl border border-dashed border-card-border py-12 text-center">
              <svg
                className="mx-auto h-10 w-10 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                />
              </svg>
              <p className="mt-3 text-sm text-text-muted">No payments yet</p>
              <p className="mt-1 text-xs text-text-muted">
                Your payment history will appear here once you subscribe.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-left">
                    <th className="pb-3 pr-4 font-medium text-text-muted">
                      Date
                    </th>
                    <th className="pb-3 pr-4 font-medium text-text-muted">
                      Description
                    </th>
                    <th className="pb-3 pr-4 font-medium text-text-muted">
                      Amount
                    </th>
                    <th className="pb-3 font-medium text-text-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {PAYMENT_HISTORY.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-3 pr-4 text-text-secondary">
                        {payment.date}
                      </td>
                      <td className="py-3 pr-4 text-text-primary">
                        {payment.description}
                      </td>
                      <td className="py-3 pr-4 text-text-primary">
                        {payment.amount}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {payment.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Support link */}
      <div className="text-center">
        <p className="text-sm text-text-muted">
          Need help with billing?{" "}
          <Link
            href="/contact"
            className="text-accent hover:underline"
          >
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
