"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LogoutPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await signOut();
      router.replace("/");
    } catch {
      setError("We could not finish signing you out. Please try again.");
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-3xl font-bold">Sign out of IOPPS</h1>
      {error && <p role="alert" className="mt-4">{error}</p>}
      {loading ? <p role="status" className="mt-4">Checking your session…</p> : user ? (
        <>
          <p className="mt-4">Ready to sign out on this device?</p>
          <button type="button" disabled={busy} onClick={handleSignOut} className="mt-6 rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white disabled:opacity-60">
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </>
      ) : <p className="mt-4">You are signed out.</p>}
      <p className="mt-6"><Link href="/" className="underline">Return to IOPPS home</Link></p>
    </section>
  );
}
