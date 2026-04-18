"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";

const REASON_MESSAGES: Record<string, string> = {
  timeout: "You were signed out due to inactivity.",
  expired: "Your session has expired. Please sign in again.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { user, loading: authLoading, signIn, signInWithGoogle, reloadUser, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const reason = searchParams.get("reason");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [slowRedirect, setSlowRedirect] = useState(false);

  const buildOnboardingRedirect = (missingFields?: unknown) => {
    const params = new URLSearchParams({ reason: "incomplete-profile" });
    if (Array.isArray(missingFields) && missingFields.length > 0) {
      params.set(
        "required",
        missingFields
          .filter((field): field is string => typeof field === "string" && field.trim().length > 0)
          .join(",")
      );
    }
    return `/org/onboarding?${params.toString()}`;
  };

  const resolvePostAuthDestination = async (
    currentUser: {
      uid: string;
      getIdToken: () => Promise<string>;
      getIdTokenResult?: () => Promise<{ claims: Record<string, unknown> }>;
    },
  ) => {
    // C-4: Check admin via ID token custom claims BEFORE reading members doc.
    // Admins may not have a members/{uid} profile; without this check they
    // were falling into the community onboarding wizard at /setup.
    try {
      if (typeof currentUser.getIdTokenResult === "function") {
        const tokenResult = await currentUser.getIdTokenResult();
        const claims = tokenResult?.claims ?? {};
        if (claims.admin === true || claims.role === "admin" || claims.role === "moderator") {
          return redirectTo || "/admin";
        }
      }
    } catch {
      /* fall through to profile-based resolution */
    }

    const profile = await getMemberProfile(currentUser.uid);

    if (profile?.role === "admin" || profile?.role === "moderator") {
      return redirectTo || "/admin";
    }

    if (!profile) return redirectTo || "/setup";

    if (profile.orgId) {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        const res = await fetch("/api/employer/check", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authorized) {
            if (data.organizationType !== "school" && data.profileReady === false) {
              return buildOnboardingRedirect(data.missingProfileFields);
            }

            return redirectTo || "/org/dashboard";
          }
        }
      }
    }

    return redirectTo || "/feed";
  };

  useEffect(() => {
    if (authLoading || !user) {
      setSlowRedirect(false);
      return;
    }

    const timeout = window.setTimeout(() => setSlowRedirect(true), 3500);
    void resolvePostAuthDestination(user).then((destination) => {
      router.replace(destination);
    });

    return () => window.clearTimeout(timeout);
  }, [user, authLoading, router, redirectTo]);

  if (authLoading || (user && !slowRedirect)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal/30 border-t-teal rounded-full animate-spin" />
          <p className="text-text-sec text-sm font-medium">Signing you in...</p>
        </div>
      </div>
    );
  }

  const handleSessionRecovery = async () => {
    setError("");
    setLoading(true);
    try {
      await reloadUser();
      if (user) {
        router.replace(await resolvePostAuthDestination(user));
      }
      setSlowRedirect(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to refresh your secure session.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = async () => {
    setLoading(true);
    try {
      await signOut();
      setSlowRedirect(false);
    } finally {
      setLoading(false);
    }
  };

  if (user && slowRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
        <div
          className="w-full max-w-md rounded-2xl"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            padding: "28px 24px",
          }}
        >
          <h1 className="text-xl font-extrabold text-text mb-2">Almost there</h1>
          <p className="text-text-sec text-sm leading-relaxed mb-5">
            Your account is signed in, but the secure redirect is taking longer than expected. You can retry the session refresh or start over.
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

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSessionRecovery}
              disabled={loading}
              className="w-full font-bold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50"
              style={{
                padding: "13px 18px",
                borderRadius: 12,
                border: "none",
                background: "var(--teal)",
                color: "#fff",
                fontSize: 15,
              }}
            >
              {loading ? "Refreshing session..." : "Retry secure redirect"}
            </button>
            <button
              type="button"
              onClick={() => {
                void resolvePostAuthDestination(user).then((destination) => {
                  router.replace(destination);
                });
              }}
              disabled={loading}
              className="w-full font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50"
              style={{
                padding: "13px 18px",
                borderRadius: 12,
                border: "1.5px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontSize: 15,
              }}
            >
              Continue anyway
            </button>
            <button
              type="button"
              onClick={handleStartOver}
              disabled={loading}
              className="w-full font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50"
              style={{
                padding: "13px 18px",
                borderRadius: 12,
                border: "1.5px solid rgba(220,38,38,.18)",
                background: "var(--red-soft)",
                color: "var(--red)",
                fontSize: 15,
              }}
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signIn(email, password);
      router.push(await resolvePostAuthDestination(cred.user));
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
      router.push(await resolvePostAuthDestination(cred.user));
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

          {/* Reason banner (timeout, expired session) */}
          {reason && REASON_MESSAGES[reason] && (
            <div
              className="text-sm font-medium mb-4"
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: "var(--gold-soft)",
                color: "var(--gold)",
                border: "1px solid rgba(217,119,6,.15)",
              }}
            >
              {REASON_MESSAGES[reason]}
            </div>
          )}

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
                autoComplete="email"
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
                  autoComplete="current-password"
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
