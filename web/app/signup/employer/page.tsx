"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { AuthInput, GoogleSignInButton } from "@/components/auth";
import { createOrganization } from "@/lib/firestore/v2-organizations";
import { createUserPrivateDoc } from "@/lib/firestore/v2-user-private";
import type { OrgType } from "@/lib/firestore/v2-types";

const ORG_TYPE_OPTIONS: {
  type: OrgType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "company",
    label: "Company",
    description: "Private sector business or corporation",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    type: "school",
    label: "School",
    description: "Educational institution or training centre",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    type: "vendor",
    label: "Vendor",
    description: "Indigenous-owned business or supplier",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72l1.189-1.19A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72M6.75 18h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z" />
      </svg>
    ),
  },
  {
    type: "nonprofit",
    label: "Nonprofit",
    description: "Charity, foundation, or community organization",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    type: "government",
    label: "Government",
    description: "Federal, provincial, municipal, or band council",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  },
  {
    type: "other",
    label: "Other",
    description: "Another type of organization",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function EmployerSignupPage() {
  const router = useRouter();
  const { signInWithGoogle, redirectLoading, user } = useAuth();
  const [step, setStep] = useState(1);
  const [orgType, setOrgType] = useState<OrgType | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle return from Google redirect sign-in
  useEffect(() => {
    if (!redirectLoading && user) {
      router.push("/org/pending");
    }
  }, [redirectLoading, user, router]);

  const handleNext = () => {
    if (!orgType) {
      setError("Please select an organization type.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleBack = () => {
    setError(null);
    setStep(1);
  };

  const notifyAdmin = async (data: Record<string, unknown>) => {
    try {
      await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {}
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!organizationName.trim()) {
      setError("Please enter your organization name.");
      return;
    }
    if (!contactPerson.trim()) {
      setError("Please enter a contact person name.");
      return;
    }
    if (!consent) {
      setError("You must agree to the OCAP and CARE principles to continue.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!auth || !db) {
      setError("Authentication is not available. Please try again later.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: organizationName.trim() });

      // Create users/{uid} doc
      await setDoc(doc(db!, "users", cred.user.uid), {
        id: cred.user.uid,
        role: "employer",
        displayName: organizationName.trim(),
        contactPerson: contactPerson.trim(),
        email: cred.user.email,
        createdAt: serverTimestamp(),
      });

      // Create v2_organizations/{orgId}
      try {
        await createOrganization({
          name: organizationName.trim(),
          type: orgType!,
          ownerUid: cred.user.uid,
          adminUids: [cred.user.uid],
        });
      } catch (orgErr) {
        console.error("Failed to create v2 organization:", orgErr);
      }

      // Create user_private/{uid} base doc
      try {
        await createUserPrivateDoc(cred.user.uid);
      } catch {}

      // Notify admin
      notifyAdmin({
        type: "new_employer",
        organizationName: organizationName.trim(),
        employerEmail: cred.user.email,
        orgType: orgType,
        status: "pending",
      });

      router.push("/org/pending");
    } catch (err) {
      console.error(err);
      setError(getAuthErrorMessage(err, "Could not create account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!consent) {
      setError("You must agree to the OCAP and CARE principles to continue.");
      return;
    }
    setError(null);
    setGoogleLoading(true);

    try {
      await signInWithGoogle();

      if (auth?.currentUser && db) {
        // Only set role to employer for new users or community members (don't downgrade admins/moderators)
        const userRef = doc(db!, "users", auth.currentUser.uid);
        const existingUser = await getDoc(userRef);
        const existingRole = existingUser.exists() ? existingUser.data()?.role : null;

        if (!existingRole || existingRole === "community") {
          await setDoc(userRef, { role: "employer" }, { merge: true });
        }

        // Create v2_organizations
        try {
          await createOrganization({
            name: auth.currentUser.displayName || "My Organization",
            type: orgType!,
            ownerUid: auth.currentUser.uid,
            adminUids: [auth.currentUser.uid],
          });
        } catch (orgErr) {
          console.error("Failed to create v2 organization:", orgErr);
        }

        // Create user_private base doc
        try {
          await createUserPrivateDoc(auth.currentUser.uid);
        } catch {}

        notifyAdmin({
          type: "new_employer",
          organizationName: auth.currentUser.displayName || "Google User",
          employerEmail: auth.currentUser.email,
          orgType: orgType,
          status: "pending",
        });
      }

      router.push("/org/pending");
    } catch (err) {
      console.error(err);
      setError(getAuthErrorMessage(err, "Unable to sign in with Google. Please try again."));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* Minimal header */}
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-accent"
          >
            IOPPS
          </Link>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="mx-auto w-full max-w-md px-4 pt-8">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === 1 ? "bg-accent text-white" : "bg-accent/20 text-accent"}`}>
            1
          </span>
          <div className={`h-0.5 flex-1 ${step === 2 ? "bg-accent" : "bg-[var(--border)]"}`} />
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === 2 ? "bg-accent text-white" : "bg-[var(--border)] text-[var(--text-muted)]"}`}>
            2
          </span>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Step {step} of 2 &mdash; {step === 1 ? "Choose organization type" : "Create your account"}
        </p>
      </div>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {step === 1 && (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                  What type of organization?
                </h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Select the category that best describes your organization
                </p>
              </div>

              {error && (
                <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="mt-8 grid grid-cols-2 gap-3">
                {ORG_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => { setOrgType(option.type); setError(null); }}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition hover:shadow-md ${
                      orgType === option.type
                        ? "border-accent bg-[var(--accent-bg)] shadow-sm"
                        : "border-[var(--border)] bg-[var(--card-bg)]"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      orgType === option.type
                        ? "bg-accent/20 text-accent"
                        : "bg-[var(--border-lt)] text-[var(--text-secondary)]"
                    }`}>
                      {option.icon}
                    </div>
                    <span className={`text-sm font-semibold ${
                      orgType === option.type
                        ? "text-accent"
                        : "text-[var(--text-primary)]"
                    }`}>
                      {option.label}
                    </span>
                    <span className="text-xs leading-tight text-[var(--text-muted)]">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="mt-8 w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!orgType}
              >
                Next
              </button>

              <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-accent hover:underline">
                  Log in
                </Link>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                  Register Your Organization
                </h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Create your account to get started with IOPPS
                </p>
              </div>

              <div className="mt-8 space-y-6">
                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  loading={googleLoading}
                  disabled={loading}
                  text="Sign up with Google"
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border)]" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-[var(--background)] px-4 text-[var(--text-muted)]">
                      Or register with email
                    </span>
                  </div>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm sm:p-8"
                >
                  <AuthInput
                    label="Organization Name"
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Your organization or company name"
                    autoComplete="organization"
                  />

                  <AuthInput
                    label="Contact Person"
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Full name of primary contact"
                    autoComplete="name"
                  />

                  <AuthInput
                    label="Email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@yourorganization.com"
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

                  {/* OCAP/CARE Consent */}
                  <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      I agree to uphold{" "}
                      <span className="font-semibold text-[var(--text-primary)]">OCAP</span> (Ownership, Control, Access, Possession) and{" "}
                      <span className="font-semibold text-[var(--text-primary)]">CARE</span> (Collective Benefit, Authority to Control, Responsibility, Ethics) principles for Indigenous data sovereignty.
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--border-lt)] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || googleLoading}
                      className="flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating account...
                        </span>
                      ) : (
                        "Create organization account"
                      )}
                    </button>
                  </div>

                  <p className="text-center text-xs text-[var(--text-muted)]">
                    By creating an account you agree to our{" "}
                    <Link href="/privacy" className="text-accent hover:underline">
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/terms" className="text-accent hover:underline">
                      Terms of Service
                    </Link>
                  </p>
                </form>

                <p className="text-center text-sm text-[var(--text-secondary)]">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-accent hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
