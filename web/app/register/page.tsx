"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
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

type UserRole = "community" | "employer";

export default function RegisterPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

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

      // Auto-create vendor profile for employers
      if (role === "employer") {
        try {
          await createDraftVendorForEmployer(
            cred.user.uid,
            displayName.trim(),
            cred.user.email || email
          );
        } catch (vendorErr) {
          console.error("Failed to create vendor profile:", vendorErr);
          // Don't fail registration if vendor creation fails
        }
      }

      try {
        await sendEmailVerification(cred.user);
        setSuccess(true);
      } catch (verifyError) {
        console.error("Email verification error:", verifyError);
        router.push(role === "employer" ? "/organization/dashboard?tab=shop" : "/jobs");
      }
    } catch (err) {
      console.error(err);

      let message = "Could not create account.";
      if (err instanceof Error) {
        if (err.message.includes("network-request-failed")) {
          message = "Network error. Firebase emulators may not be running. Please check your connection or contact support.";
        } else if (err.message.includes("email-already-in-use")) {
          message = "This email is already registered. Try logging in instead.";
        } else if (err.message.includes("weak-password")) {
          message = "Password is too weak. Please use at least 6 characters.";
        } else if (err.message.includes("invalid-email")) {
          message = "Invalid email address. Please check and try again.";
        } else {
          message = err.message;
        }
      }
      setError(message);
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
        router.push("/jobs");
      }
    } catch (err) {
      console.error(err);

      let message = "Unable to sign in with Google. Please try again.";
      if (err instanceof Error) {
        if (err.message.includes("popup-closed-by-user")) {
          message = "Sign-in cancelled. Please try again when ready.";
        } else if (err.message.includes("popup-blocked")) {
          message = "Pop-up blocked. Please allow pop-ups for this site and try again.";
        } else if (err.message.includes("network-request-failed")) {
          message = "Network error. Please check your connection and try again.";
        } else if (!err.message.includes("offline mode")) {
          message = err.message;
        }
      }
      setError(message);
      setGoogleLoading(false);
    }
  };

  const handleRoleSelection = async (selectedRole: UserRole) => {
    if (!auth || !db || !auth.currentUser) return;

    try {
      await setDoc(
        doc(db!, "users", auth.currentUser.uid),
        { role: selectedRole },
        { merge: true }
      );

      // Auto-create vendor profile for employers
      if (selectedRole === "employer") {
        try {
          await createDraftVendorForEmployer(
            auth.currentUser.uid,
            auth.currentUser.displayName || "",
            auth.currentUser.email || ""
          );
        } catch (vendorErr) {
          console.error("Failed to create vendor profile:", vendorErr);
          // Don't fail role selection if vendor creation fails
        }
      }

      router.push(selectedRole === "employer" ? "/organization/dashboard?tab=shop" : "/jobs");
    } catch (err) {
      console.error(err);
      setError("Failed to update role. Please try again.");
      setShowRoleSelector(false);
    }
  };

  return (
    <>
      {/* Role Selector Modal for Google Sign-In */}
      {showRoleSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 shadow-lg shadow-black/50 animate-fade-in">
            <h2 className="text-xl font-semibold text-slate-50">
              Choose your account type
            </h2>
            <p className="mt-2 text-sm text-slate-400">
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

      <AuthLayout title="Register" subtitle="Create your IOPPS account">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success ? (
          <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 text-green-200 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            <p className="mt-4 text-xs text-green-300">
              Don&apos;t see the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setDisplayName("");
                  setRole(null);
                }}
                className="underline hover:text-green-100"
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

            <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
              <AuthInput
                label="Name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name or organization"
              />

              <AuthInput
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <AuthInput
                label="Password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="Must be at least 6 characters"
              />

              <AuthInput
                label="Confirm Password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <div>
                <p className="block text-sm font-medium text-slate-200 mb-3">
                  I am signing up as:
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <RoleCard
                    icon={<CommunityIcon />}
                    title="Community Member"
                    description="Find jobs, save opportunities, and explore events."
                    selected={role === "community"}
                    onClick={() => setRole("community")}
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

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full rounded-full bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                  "Create account"
                )}
              </button>

              <p className="text-center text-xs text-slate-400">
                By creating an account you agree to our{" "}
                <Link href="/privacy" className="text-[#14B8A6] hover:underline">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="text-[#14B8A6] hover:underline">
                  Terms of Service
                </Link>
              </p>

              <p className="text-center text-sm text-slate-400">
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
