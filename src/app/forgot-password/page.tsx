"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.includes("user-not-found")) setError("No account found with this email.");
      else if (msg.includes("invalid-email")) setError("Please enter a valid email address.");
      else if (msg.includes("too-many-requests")) setError("Too many attempts. Please try again later.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="absolute rounded-full auth-float" style={{ top: -80, right: -80, width: 300, height: 300, background: "rgba(13,148,136,.08)" }} />
        <div className="absolute rounded-full auth-float-slow" style={{ bottom: -40, left: -40, width: 200, height: 200, background: "rgba(217,119,6,.06)" }} />

        <div>
          <Link href="/" className="inline-flex items-center gap-3 no-underline mb-16">
            <Image src="/logo.png" alt="IOPPS" width={44} height={44} />
            <span className="text-white text-xl font-extrabold tracking-[3px]">IOPPS</span>
          </Link>
          <div className="auth-fade-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-white text-3xl font-extrabold leading-tight mb-4">
              No worries, it happens
            </h2>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: 15, lineHeight: 1.7 }}>
              We&apos;ll send you a link to reset your password and get you back into your account.
            </p>
          </div>
        </div>

        <div className="auth-fade-up" style={{ animationDelay: "0.3s" }}>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 500 }}>
            Check your spam folder if you don&apos;t see the email within a few minutes.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] auth-fade-up">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 no-underline mb-8">
            <Image src="/logo.png" alt="IOPPS" width={36} height={36} />
            <span className="text-text text-lg font-extrabold tracking-[2px]">IOPPS</span>
          </Link>

          {sent ? (
            /* Success state */
            <div className="text-center auth-scale-in">
              <div
                className="inline-flex items-center justify-center rounded-full mb-6"
                style={{ width: 64, height: 64, background: "var(--green-soft)" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-text mb-2">Check your email</h1>
              <p className="text-text-sec text-[15px] mb-2 leading-relaxed">
                We sent a password reset link to
              </p>
              <p className="text-text font-semibold text-[15px] mb-6">{email}</p>
              <p className="text-text-muted text-sm mb-8 leading-relaxed">
                Click the link in the email to create a new password. If you don&apos;t see it, check your spam folder.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  className="block w-full text-center font-bold no-underline transition-all duration-150 hover:opacity-90"
                  style={{
                    padding: "14px 24px",
                    borderRadius: 12,
                    background: "var(--teal)",
                    color: "#fff",
                    fontSize: 16,
                  }}
                >
                  Back to Sign In
                </Link>
                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="w-full font-semibold cursor-pointer transition-all duration-150 hover:opacity-80"
                  style={{
                    padding: "12px 24px",
                    borderRadius: 12,
                    border: "1.5px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--text-sec)",
                    fontSize: 15,
                  }}
                >
                  Try a different email
                </button>
              </div>
            </div>
          ) : (
            /* Form state */
            <>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-text-sec text-sm font-medium no-underline hover:text-text mb-6">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to sign in
              </Link>

              <h1 className="text-2xl font-extrabold text-text mb-1">Reset your password</h1>
              <p className="text-text-sec text-[15px] mb-8">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div
                  className="text-sm font-medium mb-4 auth-scale-in"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "var(--red-soft)",
                    color: "var(--red)",
                    border: "1px solid rgba(220,38,38,.15)",
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-text-sec mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full outline-none transition-all duration-150"
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1.5px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      fontSize: 15,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-bold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50"
                  style={{
                    padding: "14px 24px",
                    borderRadius: 12,
                    border: "none",
                    background: "var(--teal)",
                    color: "#fff",
                    fontSize: 16,
                    marginTop: 4,
                  }}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
