"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/Button";
import Card from "@/components/Card";

type AccountType = "member" | "org";

export default function SignupPage() {
  const [accountType, setAccountType] = useState<AccountType>("member");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/feed");
    }
  }, [user, authLoading, router]);

  if (authLoading || user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await signUp(name, email, password);
      router.push("/setup");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account";
      if (msg.includes("email-already-in-use")) {
        setError("An account with this email already exists.");
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
        <Link href="/" className="no-underline">
          <h1 className="text-white font-black text-4xl tracking-[3px] mb-2 relative">IOPPS</h1>
        </Link>
        <p className="text-sm relative" style={{ color: "rgba(255,255,255,.6)" }}>
          Join the community
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex justify-center" style={{ padding: "40px 24px" }}>
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-text mb-6">Create Account</h2>

          {/* Account Type Selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card
              onClick={() => setAccountType("member")}
              style={{
                border: accountType === "member"
                  ? "2px solid var(--teal)"
                  : "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <div style={{ padding: 16 }} className="text-center">
                <div
                  className="mx-auto mb-2 flex items-center justify-center rounded-full"
                  style={{
                    width: 40,
                    height: 40,
                    background: accountType === "member"
                      ? "rgba(13,148,136,.12)"
                      : "rgba(128,128,128,.08)",
                  }}
                >
                  <span className="text-lg">&#128100;</span>
                </div>
                <p className="text-sm font-bold text-text m-0">Community Member</p>
                <p className="text-xs text-text-muted mt-1 m-0">
                  Find jobs, events &amp; connect
                </p>
              </div>
            </Card>
            <Card
              onClick={() => setAccountType("org")}
              style={{
                border: accountType === "org"
                  ? "2px solid var(--teal)"
                  : "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <div style={{ padding: 16 }} className="text-center">
                <div
                  className="mx-auto mb-2 flex items-center justify-center rounded-full"
                  style={{
                    width: 40,
                    height: 40,
                    background: accountType === "org"
                      ? "rgba(13,148,136,.12)"
                      : "rgba(128,128,128,.08)",
                  }}
                >
                  <span className="text-lg">&#127970;</span>
                </div>
                <p className="text-sm font-bold text-text m-0">Organization</p>
                <p className="text-xs text-text-muted mt-1 m-0">
                  Post jobs &amp; manage hiring
                </p>
              </div>
            </Card>
          </div>

          {accountType === "org" ? (
            /* Organization CTA */
            <div className="text-center py-4">
              <div
                className="mx-auto mb-4 flex items-center justify-center rounded-full"
                style={{
                  width: 56,
                  height: 56,
                  background: "rgba(13,148,136,.1)",
                }}
              >
                <span className="text-2xl">&#127970;</span>
              </div>
              <p className="text-sm text-text-sec leading-relaxed mb-6 max-w-sm mx-auto">
                Register your organization to post jobs, manage applicants, and showcase your brand.
              </p>
              <Link href="/org/signup" className="no-underline">
                <Button
                  primary
                  full
                  style={{
                    background: "var(--teal)",
                    padding: "14px 24px",
                    borderRadius: 14,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Register Organization
                </Button>
              </Link>
              <p className="text-center text-sm text-text-sec mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-teal font-semibold no-underline hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            /* Community Member Signup Form */
            <>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-soft text-red text-sm font-medium">
                  {error}
                </div>
              )}

              <label className="block mb-4">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Full Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                  placeholder="Your full name"
                />
              </label>

              <label className="block mb-4">
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

              <label className="block mb-4">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                  placeholder="At least 6 characters"
                />
              </label>

              <label className="block mb-6">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Confirm Password</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                  placeholder="Re-enter your password"
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
                {loading ? "Creating account..." : "Join the Community"}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-xs font-medium text-text-muted">OR</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>

              {/* Google Sign-Up */}
              <button
                type="button"
                onClick={async () => {
                  setError("");
                  try {
                    await signInWithGoogle();
                    router.push("/setup");
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : "Google sign-in failed";
                    if (!msg.includes("popup-closed")) setError(msg);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-card text-text text-sm font-semibold cursor-pointer transition-all hover:border-teal"
                style={{ background: "var(--card)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign up with Google
              </button>

              <p className="text-center text-sm text-text-sec mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-teal font-semibold no-underline hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
