"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/feed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
        setError("Invalid email or password.");
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
          Welcome back
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex justify-center" style={{ padding: "40px 24px" }}>
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-text mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-soft text-red text-sm font-medium">
              {error}
            </div>
          )}

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

          <label className="block mb-2">
            <span className="text-sm font-semibold text-text-sec mb-1.5 block">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
              placeholder="Enter your password"
            />
          </label>

          <div className="text-right mb-6">
            <Link href="/forgot-password" className="text-sm font-semibold text-teal no-underline hover:underline">
              Forgot password?
            </Link>
          </div>

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
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-center text-sm text-text-sec mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-teal font-semibold no-underline hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
