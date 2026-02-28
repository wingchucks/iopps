"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/Button";

const ORG_TYPES = [
  { value: "business", label: "Business" },
  { value: "school", label: "School / Educational Institution" },
  { value: "non-profit", label: "Non-Profit Organization" },
  { value: "government", label: "Government Agency" },
  { value: "legal", label: "Legal Services" },
  { value: "professional", label: "Professional Services" },
] as const;

export default function OrgSignupPage() {
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<"business" | "school" | "non-profit" | "government">("business");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [emailInUse, setEmailInUse] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const signingUpRef = useRef(false); // Prevents useEffect redirect during signup

  useEffect(() => {
    if (!authLoading && user && !signingUpRef.current) {
      // Already an employer → go to dashboard/onboarding
      // Community member → redirect to upgrade flow
      user.getIdTokenResult().then((result) => {
        const role = result.claims.role;
        if (role === "employer") {
          router.replace("/org/dashboard");
        } else {
          router.replace("/org/upgrade");
        }
      });
    }
  }, [user, authLoading, router]);

  if (authLoading || (user && !signingUpRef.current)) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!acceptTerms) {
      setError("You must accept the Terms of Service to continue.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    signingUpRef.current = true; // Block useEffect redirect
    try {
      await signUp(contactName, email, password);

      // Get ID token for server-side API call
      const { auth } = await import("@/lib/firebase");
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Failed to get user after signup");
      const idToken = await currentUser.getIdToken();

      // Create org via server-side API (Admin SDK — atomic, secure)
      const res = await fetch("/api/employer/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: orgName,
          type: orgType,
          contactName,
          contactEmail: email,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(data.error || "Failed to create organization");
      }

      router.push("/org/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account";
      if (msg.includes("email-already-in-use")) {
        setError("An account with this email already exists.");
        setEmailInUse(true);
      } else {
        setError(msg);
        setEmailInUse(false);
      }
    } finally {
      setLoading(false);
      signingUpRef.current = false;
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal";

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
          Register your organization
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex justify-center" style={{ padding: "40px 24px" }}>
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-text mb-6">Organization Registration</h2>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={async () => {
              setError("");
              setLoading(true);
              try {
                await signInWithGoogle();
                // useEffect will handle redirect based on role
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Something went wrong.";
                if (!msg.includes("popup-closed")) setError(msg);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 mb-4"
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

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-text-muted text-xs font-medium">or register with email</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-soft text-red text-sm font-medium">
              {error}
              {emailInUse && (
                <>
                  {" "}
                  <Link href="/login" className="text-teal font-semibold underline">
                    Sign in
                  </Link>{" "}
                  to upgrade your account to an organization.
                </>
              )}
            </div>
          )}

          <label className="block mb-4">
            <span className="text-sm font-semibold text-text-sec mb-1.5 block">Organization Name</span>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              autoComplete="organization"
              className={inputClass}
              placeholder="Your organization's name"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-semibold text-text-sec mb-1.5 block">Organization Type</span>
            <select
              value={orgType}
              onChange={(e) => setOrgType(e.target.value as typeof orgType)}
              className={inputClass}
            >
              {ORG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block mb-4">
            <span className="text-sm font-semibold text-text-sec mb-1.5 block">Contact Name</span>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
              autoComplete="name"
              className={inputClass}
              placeholder="Primary contact person"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-semibold text-text-sec mb-1.5 block">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="org@example.com"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-semibold text-text-sec mb-1.5 block">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={inputClass}
              placeholder="At least 6 characters"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-semibold text-text-sec mb-1.5 block">Confirm Password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className={inputClass}
              placeholder="Re-enter your password"
            />
          </label>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-teal cursor-pointer"
            />
            <span className="text-sm text-text-sec leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" className="text-teal font-semibold no-underline hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="text-teal font-semibold no-underline hover:underline">
                Privacy Policy
              </Link>
            </span>
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
            {loading ? "Creating account..." : "Register Organization"}
          </Button>

          <p className="text-center text-sm text-text-sec mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-teal font-semibold no-underline hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-sm text-text-sec mt-3">
            <Link href="/" className="text-text-muted no-underline hover:underline">
              &larr; Back to home
            </Link>
          </p>

          <p className="text-text-muted text-[11px] text-center mt-4 leading-relaxed flex items-center justify-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Protected by reCAPTCHA Enterprise
          </p>
        </form>
      </div>
    </div>
  );
}
