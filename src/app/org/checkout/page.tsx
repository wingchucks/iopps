"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import { createSubscription } from "@/lib/firestore/subscriptions";

/* ── Plan configuration ── */
interface PlanConfig {
  name: string;
  price: number;
  billingCycle: "monthly" | "annual" | "one-time";
  period: string;
}

const plans: Record<string, PlanConfig> = {
  tier1: { name: "Standard", price: 1250, billingCycle: "annual", period: "/year" },
  tier2: { name: "Premium", price: 2500, billingCycle: "annual", period: "/year" },
  tier3: { name: "School", price: 5500, billingCycle: "annual", period: "/year" },
  "standard-post": { name: "Standard Job Post", price: 125, billingCycle: "one-time", period: "/post" },
  "featured-post": { name: "Featured Job Post", price: 200, billingCycle: "one-time", period: "/post" },
  "program-post": { name: "Program Post", price: 50, billingCycle: "one-time", period: "/post" },
};

const GST_RATE = 0.05;

const provinces = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
];

/* ── Helpers ── */
function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

/* ── Main page ── */
export default function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = use(searchParams);
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <CheckoutContent planKey={params.plan || "tier1"} />
      </div>
    </ProtectedRoute>
  );
}

function CheckoutContent({ planKey }: { planKey: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const plan = plans[planKey] || plans.tier1;
  const gst = plan.price * GST_RATE;
  const total = plan.price + gst;

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || submitting) return;

    setSubmitting(true);
    try {
      const now = new Date();
      let expiresAt: Date;
      if (plan.billingCycle === "annual") {
        expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      } else if (plan.billingCycle === "monthly") {
        expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      } else {
        expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      }

      await createSubscription({
        orgId: user.uid,
        plan: planKey,
        status: "pending",
        amount: plan.price,
        gstAmount: Math.round(gst * 100) / 100,
        totalAmount: Math.round(total * 100) / 100,
        billingCycle: plan.billingCycle,
        expiresAt,
      });

      setShowSuccess(true);
      setTimeout(() => router.push("/org/dashboard"), 3000);
    } catch {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl px-4 py-3 text-sm text-text outline-none transition-all focus:ring-2 focus:ring-teal";

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-w-md mx-4">
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
              <h2 className="text-xl font-bold text-text mb-2">Payment Submitted!</h2>
              <p className="text-sm text-text-sec">
                Your subscription is being processed. You&apos;ll receive confirmation shortly.
              </p>
              <p className="text-xs text-text-muted mt-3">Redirecting to dashboard...</p>
            </div>
          </Card>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/org/plans"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Plans
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-1">Checkout</h1>
        <p className="text-sm text-text-muted m-0">Complete your payment to get started</p>
      </div>

      {/* 2-column layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Payment form */}
          <div className="lg:col-span-3">
            <Card>
              <div style={{ padding: "28px 24px" }}>
                <h2 className="text-lg font-bold text-text mb-5">Payment Details</h2>

                {/* Cardholder name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-sec mb-1.5">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full name on card"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className={inputClass}
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  />
                </div>

                {/* Card number */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-sec mb-1.5">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    className={inputClass}
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  />
                </div>

                {/* Expiry + CVC row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-text-sec mb-1.5">
                      Expiry
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                      className={inputClass}
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-sec mb-1.5">
                      CVC
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className={inputClass}
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    />
                  </div>
                </div>

                {/* Billing address */}
                <h3 className="text-base font-bold text-text mb-4">Billing Address</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-sec mb-1.5">
                    Street Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="123 Main Street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className={inputClass}
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-text-sec mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputClass}
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-sec mb-1.5">
                      Province
                    </label>
                    <select
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className={inputClass}
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    >
                      <option value="">Select province</option>
                      {provinces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-sm font-medium text-text-sec mb-1.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="A1B 2C3"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.toUpperCase().slice(0, 7))}
                    maxLength={7}
                    className={`${inputClass} max-w-[200px]`}
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-2">
            <Card>
              <div style={{ padding: "28px 24px" }}>
                <h2 className="text-lg font-bold text-text mb-5">Order Summary</h2>

                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-text-sec">{plan.name}</span>
                  <span className="text-sm font-semibold text-text">
                    ${plan.price.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-text-sec">GST (5%)</span>
                  <span className="text-sm font-semibold text-text">
                    ${gst.toFixed(2)}
                  </span>
                </div>

                <div
                  className="flex justify-between items-center pt-3 mb-5"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <span className="text-base font-bold text-text">Total</span>
                  <span className="text-base font-bold text-text">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-text-muted mb-5">
                  {plan.billingCycle === "one-time"
                    ? "One-time payment"
                    : `Billed ${plan.billingCycle}`}
                </p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl border-none font-semibold text-base cursor-pointer transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "var(--navy)", color: "#fff" }}
                >
                  {submitting ? "Processing..." : "Complete Payment"}
                </button>

                <p className="text-xs text-text-muted text-center mt-3">
                  Your payment information is secure and encrypted
                </p>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
