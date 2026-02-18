"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";

export default function LoginPage() {
  const { user, loading: authLoading, signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) router.replace("/feed");
  }, [user, authLoading, router]);

  if (authLoading || user) return null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signIn(email, password);
      const profile = await getMemberProfile(cred.user.uid);
      router.push(profile ? "/feed" : "/setup");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential"))
        setError("Invalid email or password.");
      else if (msg.includes("too-many-requests"))
        setError("Too many attempts. Please try again later.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithGoogle();
      const profile = await getMemberProfile(cred.user.uid);
      router.push(profile ? "/feed" : "/setup");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (!msg.includes("popup-closed")) setError(msg);
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
              Welcome back
            </h2>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: 15, lineHeight: 1.7 }}>
              Pick up where you left off. Your community, opportunities, and connections are waiting.
            </p>
          </div>
        </div>

        <div className="auth-fade-up flex flex-col gap-4" style={{ animationDelay: "0.3s" }}>
          {[
            { icon: "\u{1F4E3}", text: "New job postings every day" },
            { icon: "\u{1FAB6}", text: "Upcoming events & pow wows" },
            { icon: "\u{1F4AC}", text: "Messages from your network" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <span style={{ color: "rgba(255,255,255,.75)", fontSize: 14, fontWeight: 500 }}>{item.text}</span>
            </div>
          ))}
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

          <h1 className="text-2xl font-extrabold text-text mb-1">Sign in to IOPPS</h1>
          <p className="text-text-sec text-[15px] mb-8">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-teal font-semibold no-underline hover:underline">
              Sign up
            </Link>
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50"
            style={{
              padding: "13px 20px",
              borderRadius: 12,
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontSize: 15,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.9 23.9 0 000 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-text-muted text-xs font-medium">or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

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

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[13px] font-semibold text-text-sec">Password</label>
                <Link href="/forgot-password" className="text-teal text-[13px] font-semibold no-underline hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full outline-none transition-all duration-150"
                  style={{
                    padding: "12px 16px",
                    paddingRight: 48,
                    borderRadius: 10,
                    border: "1.5px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--text)",
                    fontSize: 15,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-sec cursor-pointer"
                  style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600 }}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
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
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-text-muted text-xs text-center mt-6 leading-relaxed">
            New to IOPPS?{" "}
            <Link href="/signup" className="text-teal no-underline hover:underline">
              Create a free account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
