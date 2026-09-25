"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import SelectedOfferSummary from "@/components/pricing/SelectedOfferSummary";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { authErrorMessage } from "@/lib/auth-errors";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const { user, loading: authLoading, sendVerificationEmail, reloadUser, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const nextPath = searchParams.get("next");
  const redirectPath = safeAuthRedirect(nextPath) || "/setup";
  // An offer chosen before signup continues to checkout after verification.
  const checkoutPlan = redirectPath.startsWith("/org/checkout?") ? new URLSearchParams(redirectPath.split("?")[1]).get("plan") : null;

  // If already verified, redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
    }
    if (user?.emailVerified) {
      router.replace(redirectPath);
    }
  }, [user, authLoading, redirectPath, router]);

  // Poll for verification every 5 seconds
  useEffect(() => {
    if (!user || user.emailVerified) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const verified = await reloadUser(user?.uid);
        if (!cancelled && verified) router.replace(redirectPath);
      } catch (error) {
        if (!cancelled) setVerificationError(authErrorMessage(error, "We couldn’t check verification. Please retry below."));
      }
    }, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user, reloadUser, redirectPath, router]);

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    setVerificationError("");
    try {
      const sent = await sendVerificationEmail(redirectPath, user?.uid);
      setResent(sent);
      if (!sent) await reloadUser(user?.uid);
    } catch (error) {
          setVerificationError(authErrorMessage(error, "The email couldn’t be sent. Please wait a moment and retry."));
    } finally {
      setResending(false);
    }
  };

  const handleCheckNow = useCallback(async () => {
    setChecking(true);
    setVerificationError("");
    try {
      if (await reloadUser(user?.uid)) router.replace(redirectPath);
      else setVerificationError("Your email isn’t verified yet. Open the link in your email, then check again.");
    } catch (error) {
          setVerificationError(authErrorMessage(error, "We couldn’t refresh your session. Please check your connection and retry."));
    } finally {
      setChecking(false);
    }
  }, [reloadUser, redirectPath, router, user?.uid]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Left branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between relative overflow-hidden"
        style={{
          width: "44%",
          background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 50%, #0D3B66 75%, var(--teal) 100%)",
          padding: "48px 48px 40px",
        }}
      >
        <div className="absolute rounded-full" style={{ top: -80, right: -80, width: 300, height: 300, background: "rgba(13,148,136,.08)" }} />
        <div>
          <Link href="/" className="inline-flex items-center gap-3 no-underline mb-16">
            <Image src="/logo.png" alt="IOPPS" width={44} height={44} />
            <span className="text-white text-xl font-extrabold tracking-[3px]">IOPPS</span>
          </Link>
          <h2 className="text-white text-3xl font-extrabold leading-tight mb-4">
            One last step
          </h2>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: 15, lineHeight: 1.7 }}>
            Verify your email address to get started with IOPPS.
          </p>
        </div>
        <div />
      </div>

      {/* Right content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] text-center">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center justify-center gap-2 no-underline mb-8">
            <Image src="/logo.png" alt="IOPPS" width={36} height={36} />
            <span className="text-text text-lg font-extrabold tracking-[2px]">IOPPS</span>
          </Link>

          {checkoutPlan && <div className="text-left"><SelectedOfferSummary planId={checkoutPlan} /></div>}
          <div className="text-5xl mb-4">&#9993;&#65039;</div>
          <h1 className="text-2xl font-extrabold text-text mb-2">Check your email</h1>
          <p className="text-text-sec text-[15px] mb-2 leading-relaxed">
            {resent ? "We sent a verification link to" : "Verify the email address"}
          </p>
          <p className="text-teal font-semibold text-[15px] mb-6">{user.email}</p>

          <p className="text-text-muted text-sm mb-6 leading-relaxed">
            Click the link in your email to verify your account. This page will automatically update once verified.
          </p>

          {verificationError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{verificationError}</p>}

          <button
            onClick={handleCheckNow}
            disabled={checking}
            className="brand-button w-full font-bold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 mb-3"
            style={{
              padding: "14px 24px",
              borderRadius: 12,
              border: "none",
              background: "var(--button-gradient)",
              color: "#fff",
              fontSize: 16,
            }}
          >
            {checking ? "Checking..." : "I've verified my email"}
          </button>

          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="brand-button w-full font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50"
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "1.5px solid var(--border)",
              background: "var(--button-gradient-soft)",
              color: "var(--button-gradient-soft-text)",
              fontSize: 15,
            }}
          >
            {resent ? "Email sent!" : resending ? "Sending..." : "Resend verification email"}
          </button>

          <div className="mt-8">
            <button
              onClick={() => { void signOut().catch(error => setVerificationError(authErrorMessage(error, "We couldn’t sign you out. Please try again."))); }}
              className="text-text-muted text-sm font-medium cursor-pointer hover:underline"
              style={{ background: "none", border: "none" }}
            >
              Sign out and try a different email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
