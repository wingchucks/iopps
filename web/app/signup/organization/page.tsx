"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import {
  GoogleSignInButton,
  AuthInput,
} from "@/components/auth";
import { createDraftVendorForEmployer } from "@/lib/firebase/shop";
import { createPendingEmployerProfile } from "@/lib/firestore";

export default function OrganizationSignupPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

      await setDoc(doc(db!, "users", cred.user.uid), {
        id: cred.user.uid,
        role: "employer",
        displayName: organizationName.trim(),
        contactPerson: contactPerson.trim(),
        email: cred.user.email,
        createdAt: serverTimestamp(),
      });

      try {
        await createPendingEmployerProfile(cred.user.uid, {
          organizationName: organizationName.trim(),
          email: cred.user.email || email,
        });
      } catch (profileErr) {
        console.error("Failed to create employer profile:", profileErr);
      }

      try {
        await createDraftVendorForEmployer(
          cred.user.uid,
          organizationName.trim(),
          cred.user.email || email
        );
      } catch (vendorErr) {
        console.error("Failed to create vendor profile:", vendorErr);
      }

      notifyWithRetry({
        type: "new_employer",
        organizationName: organizationName.trim(),
        employerEmail: cred.user.email,
        status: "pending",
      });

      router.push("/welcome");
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
      const { isNewUser } = await signInWithGoogle();

      if (isNewUser && auth?.currentUser && db) {
        await setDoc(
          doc(db!, "users", auth.currentUser.uid),
          { role: "employer" },
          { merge: true }
        );

        try {
          await createPendingEmployerProfile(auth.currentUser.uid, {
            organizationName: auth.currentUser.displayName || "Google User",
            email: auth.currentUser.email || "",
          });
        } catch (profileErr) {
          console.error("Failed to create employer profile:", profileErr);
        }

        try {
          await createDraftVendorForEmployer(
            auth.currentUser.uid,
            auth.currentUser.displayName || "",
            auth.currentUser.email || ""
          );
        } catch (vendorErr) {
          console.error("Failed to create vendor profile:", vendorErr);
        }

        notifyWithRetry({
          type: "new_employer",
          organizationName: auth.currentUser.displayName || "Google User",
          employerEmail: auth.currentUser.email,
          status: "pending",
        });
      }

      router.push("/welcome");
    } catch (err) {
      console.error(err);
      setError(getAuthErrorMessage(err, "Unable to sign in with Google. Please try again."));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Minimal header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-teal-600"
          >
            IOPPS
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Register Your Organization
            </h1>
            <p className="mt-2 text-sm text-foreground0">
              Get started with IOPPS for your organization
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
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
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-slate-50 px-4 text-[var(--text-muted)]">
                  Or register with email
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
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
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-600 leading-relaxed">
                  I agree to uphold{" "}
                  <span className="font-semibold text-slate-800">OCAP</span> (Ownership, Control, Access, Possession) and{" "}
                  <span className="font-semibold text-slate-800">CARE</span> (Collective Benefit, Authority to Control, Responsibility, Ethics) principles for Indigenous data sovereignty.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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

              <p className="text-center text-xs text-foreground0">
                By creating an account you agree to our{" "}
                <Link href="/privacy" className="text-teal-600 hover:underline">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="text-teal-600 hover:underline">
                  Terms of Service
                </Link>
              </p>
            </form>

            <p className="text-center text-sm text-foreground0">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-teal-600 hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
