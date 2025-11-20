"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type UserRole = "community" | "employer";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("community");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }

      await setDoc(doc(db, "users", cred.user.uid), {
        id: cred.user.uid,
        role,
        displayName: displayName || null,
        email: cred.user.email,
        createdAt: serverTimestamp(),
      });

      router.push("/jobs");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Could not create account.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Create your IOPPS account</h1>
      <p className="mt-2 text-sm text-slate-300">
        Choose whether you are a community member or an employer.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Name (optional)
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            placeholder="Your name or organization"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Must be at least 6 characters (Firebase requirement).
          </p>
        </div>

        <div>
          <p className="block text-sm font-medium text-slate-200">
            I am signing up as:
          </p>
          <div className="mt-2 flex flex-col gap-2 text-sm text-slate-200">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="community"
                checked={role === "community"}
                onChange={() => setRole("community")}
              />
              <span>Community Member</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="employer"
                checked={role === "employer"}
                onChange={() => setRole("employer")}
              />
              <span>Employer</span>
            </label>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}
