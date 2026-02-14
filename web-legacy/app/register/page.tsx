"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import {
  AuthLayout,
  GoogleSignInButton,
  AuthDivider,
  AuthInput,
  RoleCard,
  CommunityIcon,
  EmployerIcon,
} from "@/components/auth";
import { createDraftVendorForEmployer } from "@/lib/firebase/shop";
import { createPendingEmployerProfile } from "@/lib/firestore";
import {
  BriefcaseIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

type UserRole = "community" | "employer";
type EmployerIntent = "post_jobs" | "list_business" | "post_events" | "multiple";

const INTENT_OPTIONS: {
  id: EmployerIntent;
  title: string;
  description: string;
  icon: typeof BriefcaseIcon;
}[] = [
  {
    id: "post_jobs",
    title: "Post Jobs",
    description: "Hire talent from Indigenous communities",
    icon: BriefcaseIcon,
  },
  {
    id: "list_business",
    title: "List Business",
    description: "Join the Shop Indigenous directory",
    icon: BuildingStorefrontIcon,
  },
  {
    id: "post_events",
    title: "Post Events",
    description: "Promote conferences & pow wows",
    icon: CalendarDaysIcon,
  },
  {
    id: "multiple",
    title: "Multiple",
    description: "I want to do several of these",
    icon: SparklesIcon,
  },
];

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle, redirectLoading, user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const initialRole = searchParams.get("role");
  const [role, setRole] = useState<UserRole | null>(
    initialRole === "community" || initialRole === "employer" ? initialRole : null
  );
  const [employerIntent, setEmployerIntent] = useState<EmployerIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showIntentSelector, setShowIntentSelector] = useState(false);
  const [pendingGoogleRole, setPendingGoogleRole] = useState<UserRole | null>(null);

  // Handle return from Google redirect sign-in
  useEffect(() => {
    if (!redirectLoading && user) {
      // User returned from redirect — show role selector for new users
      setShowRoleSelector(true);
    }
  }, [redirectLoading, user]);

  // Helper to send notification with retry
  const notifyWithRetry = async (data: Record<string, unknown>, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch("/api/admin/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) return;
      } catch (e) {
        if (i === retries) console.error("Failed to notify admin after retries", e);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Please enter your name or organization.");
      return;
    }

    if (!role) {
      setError("Please choose whether you're a community member or an employer.");
      return;
    }

    if (role === "employer" && !employerIntent) {
      setError("Please select what you'd like to do on IOPPS.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!auth || !db) {
      setError("Authentication is not available in offline mode. Please contact support.");
      return;
    }

    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(cred.user, { displayName: displayName.trim() });

      await setDoc(doc(db!, "users", cred.user.uid), {
        id: cred.user.uid,
        role,
        displayName: displayName.trim(),
        email: cred.user.email,
        createdAt: serverTimestamp(),
      });

      // Handle employer-specific setup
      if (role === "employer") {
        // Create pending employer profile for admin approval
        try {
          await createPendingEmployerProfile(cred.user.uid, {
            organizationName: displayName.trim(),
            email: cred.user.email || email,
            intent: employerIntent || undefined,
          });
        } catch (profileErr) {
          console.error("Failed to create employer profile:", profileErr);
          // Don't fail registration if profile creation fails
        }

        // Auto-create draft vendor profile
        try {
          await createDraftVendorForEmployer(
            cred.user.uid,
            displayName.trim(),
            cred.user.email || email
          );
        } catch (vendorErr) {
          console.error("Failed to create vendor profile:", vendorErr);
        }

        // Notify admin of new employer (with approval action)
        notifyWithRetry({
          type: "new_employer",
          organizationName: displayName.trim(),
          employerEmail: cred.user.email,
          intent: employerIntent,
          status: "pending",
        });
      } else {
        // Notify admin of new community member
        notifyWithRetry({
          type: "new_user",
          userEmail: cred.user.email,
          userName: displayName.trim(),
        });
      }

      // Send email verification
      try {
        await sendEmailVerification(cred.user);
        setSuccess(true);
      } catch (verifyError) {
        console.error("Email verification error:", verifyError);
        router.push(role === "employer" ? "/onboarding/organization" : "/discover");
      }
    } catch (err) {
      console.error(err);
      setError(getAuthErrorMessage(err, "Could not create account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { isNewUser } = await signInWithGoogle();

      if (isNewUser) {
        setShowRoleSelector(true);
        setGoogleLoading(false);
      } else {
        router.push("/discover");
      }
    } catch (err) {
      console.error(err);
      setError(getAuthErrorMessage(err, "Unable to sign in with Google. Please try again."));
      setGoogleLoading(false);
    }
  };

  const handleRoleSelection = async (selectedRole: UserRole) => {
    if (selectedRole === "employer") {
      // For employers, show intent selector first
      setPendingGoogleRole(selectedRole);
      setShowRoleSelector(false);
      setShowIntentSelector(true);
      return;
    }

    // For community members, complete registration immediately
    await completeGoogleRegistration(selectedRole);
  };

  const handleIntentSelection = async (intent: EmployerIntent) => {
    setEmployerIntent(intent);
    await completeGoogleRegistration("employer", intent);
  };

  const completeGoogleRegistration = async (selectedRole: UserRole, intent?: EmployerIntent) => {
    if (!auth || !db || !auth.currentUser) return;

    try {
      await setDoc(
        doc(db!, "users", auth.currentUser.uid),
        { role: selectedRole },
        { merge: true }
      );

      // Handle employer-specific setup
      if (selectedRole === "employer") {
        // Create pending employer profile for admin approval
        try {
          await createPendingEmployerProfile(auth.currentUser.uid, {
            organizationName: auth.currentUser.displayName || "Google User",
            email: auth.currentUser.email || "",
            intent: intent || undefined,
          });
        } catch (profileErr) {
          console.error("Failed to create employer profile:", profileErr);
        }

        // Auto-create draft vendor profile
        try {
          await createDraftVendorForEmployer(
            auth.currentUser.uid,
            auth.currentUser.displayName || "",
            auth.currentUser.email || ""
          );
        } catch (vendorErr) {
          console.error("Failed to create vendor profile:", vendorErr);
        }

        // Notify admin of new employer (with approval action)
        notifyWithRetry({
          type: "new_employer",
          organizationName: auth.currentUser.displayName || "Google User",
          employerEmail: auth.currentUser.email,
          intent: intent,
          status: "pending",
        });
      } else {
        // Notify admin of new community member
        notifyWithRetry({
          type: "new_user",
          userEmail: auth.currentUser.email,
          userName: auth.currentUser.displayName || "Google User",
        });
      }

      router.push(selectedRole === "employer" ? "/onboarding/organization" : "/discover");
    } catch (err) {
      console.error(err);
      setError("Failed to update role. Please try again.");
      setShowRoleSelector(false);
      setShowIntentSelector(false);
    }
  };

  // Show loading when returning from Google redirect
  if (redirectLoading) {
    return (
      <AuthLayout title="Register" subtitle="Create your IOPPS account">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <svg className="animate-spin h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-foreground0">Completing Google sign-in...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <>
      {/* Role Selector Modal for Google Sign-In */}
      {showRoleSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-lg animate-fade-in">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Choose your account type
            </h2>
            <p className="mt-2 text-sm text-foreground0">
              Select how you&apos;ll be using IOPPS
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <RoleCard
                icon={<CommunityIcon />}
                title="Community Member"
                description="Find jobs, save opportunities, and explore events."
                selected={false}
                onClick={() => handleRoleSelection("community")}
              />
              <RoleCard
                icon={<EmployerIcon />}
                title="Employer"
                description="Post jobs, promote scholarships, and feature events."
                selected={false}
                onClick={() => handleRoleSelection("employer")}
              />
            </div>
          </div>
        </div>
      )}

      {/* Intent Selector Modal for Google Sign-In (Employers) */}
      {showIntentSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-lg animate-fade-in">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              What would you like to do on IOPPS?
            </h2>
            <p className="mt-2 text-sm text-foreground0">
              Help us customize your experience
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {INTENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleIntentSelection(option.id)}
                  className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-left transition hover:border-accent/50 hover:bg-surface"
                >
                  <option.icon className="h-6 w-6 flex-shrink-0 text-accent" />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{option.title}</p>
                    <p className="mt-0.5 text-xs text-foreground0">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowIntentSelector(false);
                setShowRoleSelector(true);
                setPendingGoogleRole(null);
              }}
              className="mt-4 text-sm text-foreground0 hover:text-[var(--text-secondary)]"
            >
              ← Back to role selection
            </button>
          </div>
        </div>
      )}

      <AuthLayout title="Register" subtitle="Create your IOPPS account">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-green-800 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-lg">Account created!</p>
            </div>
            <p className="text-sm">
              We&apos;ve sent a verification email to <strong>{email}</strong>.
            </p>
            <p className="mt-3 text-sm">
              Please check your inbox and click the verification link to activate your account. After verifying, you can{" "}
              <Link href="/login" className="underline hover:text-green-100">
                sign in here
              </Link>.
            </p>
            <p className="mt-4 text-xs text-green-600">
              Don&apos;t see the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setDisplayName("");
                  setRole(null);
                  setEmployerIntent(null);
                }}
                className="underline hover:text-green-800"
              >
                try again
              </button>.
            </p>
          </div>
        ) : (
          <>
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              loading={googleLoading}
              disabled={loading}
            />

            <AuthDivider text="Or register with email" />

            <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
              {/* Step 1: Account Type Selection - FIRST */}
              <div>
                <p className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                  I am signing up as:
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <RoleCard
                    icon={<CommunityIcon />}
                    title="Community Member"
                    description="Find jobs, save opportunities, and explore events."
                    selected={role === "community"}
                    onClick={() => {
                      setRole("community");
                      setEmployerIntent(null);
                    }}
                  />
                  <RoleCard
                    icon={<EmployerIcon />}
                    title="Employer"
                    description="Post jobs, promote scholarships, and feature events."
                    selected={role === "employer"}
                    onClick={() => setRole("employer")}
                  />
                </div>
              </div>

              {/* Intent Selection for Employers */}
              {role === "employer" && (
                <div className="animate-fade-in">
                  <p className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                    What would you like to do on IOPPS?
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {INTENT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setEmployerIntent(option.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                          employerIntent === option.id
                            ? "border-accent bg-[var(--accent-bg)]"
                            : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border)]"
                        }`}
                      >
                        <option.icon className={`h-5 w-5 flex-shrink-0 ${
                          employerIntent === option.id ? "text-accent" : "text-foreground0"
                        }`} />
                        <div>
                          <p className={`text-sm font-medium ${
                            employerIntent === option.id ? "text-accent" : "text-[var(--text-secondary)]"
                          }`}>{option.title}</p>
                          <p className="mt-0.5 text-xs text-foreground0">{option.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Account Details - Only show after role is selected */}
              {role && (
                <div className="space-y-5 animate-fade-in pt-2 border-t border-[var(--border)]">
                  <AuthInput
                    label={role === "employer" ? "Organization Name" : "Your Full Name"}
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={role === "employer" ? "Your organization or company name" : "Your full name"}
                    autoComplete={role === "employer" ? "organization" : "name"}
                  />

                  <AuthInput
                    label="Email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === "employer" ? "contact@yourcompany.com" : "you@example.com"}
                    autoComplete="email"
                  />

                  <AuthInput
                    label="Password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    hint="Must be at least 6 characters"
                    autoComplete="new-password"
                  />

                  <AuthInput
                    label="Confirm Password"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              )}

              {/* Submit button - only show when role is selected */}
              {role && (
                <button
                  type="submit"
                  disabled={loading || googleLoading || (role === "employer" && !employerIntent)}
                  className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating account...
                    </span>
                  ) : role === "employer" ? (
                    "Create employer account"
                  ) : (
                    "Create account"
                  )}
                </button>
              )}

              {/* Prompt to select role if not selected */}
              {!role && (
                <div className="text-center py-4 px-6 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-sm text-foreground0">
                    Select an account type above to continue
                  </p>
                </div>
              )}

              <p className="text-center text-xs text-foreground0">
                By creating an account you agree to our{" "}
                <Link href="/privacy" className="text-[#14B8A6] hover:underline">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="text-[#14B8A6] hover:underline">
                  Terms of Service
                </Link>
              </p>

              <p className="text-center text-sm text-foreground0">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-[#14B8A6] hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          </>
        )}
      </AuthLayout>
    </>
  );
}
