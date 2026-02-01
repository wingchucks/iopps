"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore";
import { CheckIcon, BoltIcon, SparklesIcon } from "@heroicons/react/24/outline";

export default function SubscribePage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push("/login?redirect=/organization/subscribe");
      return;
    }

    if (role !== "employer") {
      router.push("/organization/onboarding");
      return;
    }

    const loadProfile = async () => {
      try {
        const employerProfile = await getEmployerProfile(user.uid);
        if (!employerProfile) {
          router.push("/organization/onboarding");
          return;
        }

        // If already approved, redirect to dashboard
        if (employerProfile.status === "approved") {
          router.push("/organization/dashboard");
          return;
        }

        setProfile(employerProfile);
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, role, authLoading, router]);

  const handleCheckout = async (productType: string) => {
    if (!user) return;
    
    setCheckoutLoading(productType);
    try {
      const idToken = await user.getIdToken();
      
      // For single job, we need to create a placeholder job first
      // For subscription, we go directly to subscription checkout
      if (productType === "subscription") {
        const res = await fetch("/api/stripe/checkout-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            tier: "TIER1", // Growth Plan
            returnUrl: `${window.location.origin}/organization/jobs/new?subscribed=true`,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to create checkout session");
        }

        const { url } = await res.json();
        window.location.href = url;
      } else {
        // Single job credit purchase - pay first, then post
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            productType: "SINGLE",
            creditPurchase: true, // Flag for credit purchase without jobId
            returnUrl: `${window.location.origin}/organization/jobs/new?credited=true`,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to create checkout session");
        }

        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
            <BoltIcon className="h-4 w-4" />
            Get Started with IOPPS
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Purchase a plan to activate your employer account and start posting jobs to Canada&apos;s largest Indigenous job board.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Single Job */}
          <div className="relative rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Single Job Post</h3>
              <p className="text-slate-400 text-sm">Perfect for occasional hiring needs</p>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$99</span>
              <span className="text-slate-400 ml-2">/ job</span>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-slate-300">
                <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                30-day job listing
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                Instant account approval
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                Indigenous talent reach
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                Application tracking
              </li>
            </ul>

            <button
              onClick={() => handleCheckout("single")}
              disabled={checkoutLoading !== null}
              className="w-full py-3 px-6 rounded-xl border border-slate-600 bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkoutLoading === "single" ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Buy Single Job"
              )}
            </button>
          </div>

          {/* Growth Plan */}
          <div className="relative rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 to-transparent p-8">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold uppercase tracking-wide">
                Best Value
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                Growth Plan
                <SparklesIcon className="h-5 w-5 text-emerald-400" />
              </h3>
              <p className="text-slate-400 text-sm">For organizations with ongoing hiring</p>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$499</span>
              <span className="text-slate-400 ml-2">/ year</span>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-slate-300">
                <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <strong className="text-white">12 job posts</strong> included
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                Instant account approval
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                Priority employer profile
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                Talent pool access (90 days)
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                Analytics dashboard
              </li>
            </ul>

            <button
              onClick={() => handleCheckout("subscription")}
              disabled={checkoutLoading !== null}
              className="w-full py-3 px-6 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkoutLoading === "subscription" ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Get Growth Plan"
              )}
            </button>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm">
            Secure payment powered by Stripe • Cancel anytime • 
            <Link href="/contact" className="text-emerald-400 hover:underline ml-1">
              Questions? Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
