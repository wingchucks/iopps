"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function VerifyEmailPage() {
  const { user, loading: authLoading, sendVerificationEmail, reloadUser, signOut } = useAuth();
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);

  // If already verified, redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
    if (user?.emailVerified) {
      router.replace("/setup");
    }
  }, [user, authLoading, router]);

  // Poll for verification every 5 seconds
  useEffect(() => {
    if (!user || user.emailVerified) return;
    const interval = setInterval(async () => {
      await reloadUser();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, reloadUser]);

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    try {
      await sendVerificationEmail();
      setResent(true);
    } catch {
      // Rate limited or other error — silently ignore
    } finally {
      setResending(false);
    }
  };

  const handleCheckNow = useCallback(async () => {
    setChecking(true);
    try {
      await reloadUser();
    } finally {
      setChecking(false);
    }
  }, [reloadUser]);

  if (authLoading || !user) return null;

  // Google users are pre-verified
  if (user.emailVerified) return null;

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

          <div className="text-5xl mb-4">&#9993;&#65039;</div>
          <h1 className="text-2xl font-extrabold text-text mb-2">Check your email</h1>
          <p className="text-text-sec text-[15px] mb-2 leading-relaxed">
            We sent a verification link to
          </p>
          <p className="text-teal font-semibold text-[15px] mb-6">{user.email}</p>

          <p className="text-text-muted text-sm mb-6 leading-relaxed">
            Click the link in your email to verify your account. This page will automatically update once verified.
          </p>

          <button
            onClick={handleCheckNow}
            disabled={checking}
            className="w-full font-bold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 mb-3"
            style={{
              padding: "14px 24px",
              borderRadius: 12,
              border: "none",
              background: "var(--teal)",
              color: "#fff",
              fontSize: 16,
            }}
          >
            {checking ? "Checking..." : "I've verified my email"}
          </button>

          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="w-full font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50"
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              color: "var(--text-sec)",
              fontSize: 15,
            }}
          >
            {resent ? "Email sent!" : resending ? "Sending..." : "Resend verification email"}
          </button>

          <div className="mt-8 flex flex-col gap-2">
            <button
              onClick={signOut}
              className="text-text-muted text-sm font-medium cursor-pointer hover:underline"
              style={{ background: "none", border: "none" }}
            >
              Sign out and try a different email
            </button>
            <Link href="/setup" className="text-teal text-sm font-semibold no-underline hover:underline">
              Skip for now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
