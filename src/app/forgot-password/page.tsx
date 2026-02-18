"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset email";
      if (msg.includes("user-not-found")) {
        setError("No account found with this email.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div
        className="text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 50%, var(--teal) 100%)",
          padding: "48px 24px 40px",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ top: -80, right: -80, width: 300, height: 300, background: "rgba(13,148,136,.06)" }}
        />
        <Link href="/" className="no-underline flex flex-col items-center">
          <img src="/logo.png" alt="IOPPS" width={72} height={72} className="relative mb-3" />
          <h1 className="text-white font-black text-4xl tracking-[3px] mb-2 relative">IOPPS</h1>
        </Link>
        <p className="text-sm relative" style={{ color: "rgba(255,255,255,.6)" }}>
          Reset your password
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex justify-center" style={{ padding: "40px 24px" }}>
        <div className="w-full max-w-md">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-soft flex items-center justify-center text-3xl mx-auto mb-4">
                &#9993;
              </div>
              <h2 className="text-2xl font-bold text-text mb-3">Check your email</h2>
              <p className="text-text-sec mb-6">
                We sent a password reset link to <strong className="text-text">{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <Link href="/login" className="text-teal font-semibold no-underline hover:underline">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold text-text mb-2">Forgot Password</h2>
              <p className="text-text-sec text-sm mb-6">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-soft text-red text-sm font-medium">
                  {error}
                </div>
              )}

              <label className="block mb-6">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                  placeholder="you@example.com"
                />
              </label>

              <Button
                primary
                full
                style={{
                  background: "var(--teal)",
                  padding: "14px 24px",
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 700,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <p className="text-center text-sm text-text-sec mt-6">
                <Link href="/login" className="text-teal font-semibold no-underline hover:underline">
                  Back to Sign In
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
