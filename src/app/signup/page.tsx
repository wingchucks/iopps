"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/Button";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

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
      router.push("/feed");
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
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text text-sm outline-none transition-all focus:border-teal"
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
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text text-sm outline-none transition-all focus:border-teal"
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
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text text-sm outline-none transition-all focus:border-teal"
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
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text text-sm outline-none transition-all focus:border-teal"
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

          <p className="text-center text-sm text-text-sec mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-teal font-semibold no-underline hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
