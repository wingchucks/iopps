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
  const { signUp, user, loading: authLoading } = useAuth();
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
        </form>
      </div>
    </div>
  );
}
