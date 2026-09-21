"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { applyActionCode, checkActionCode, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { completeVerificationAction, verificationContinuePath, validateResetAction, resetContinuePath } from "./verification-action";

type State = "loading" | "success" | "error";
type ResetState = State | "ready";

export function VerificationActionView({ state, continuePath }: { state: State; continuePath: string }) {
  return <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-bg">
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
      <Link href="/" className="text-teal text-xl font-extrabold tracking-widest">IOPPS</Link>
      <h1 className="text-2xl font-extrabold text-text mt-6 mb-4">
        {state === "loading" ? "Verifying your email" : state === "success" ? "Email verified" : "We couldn’t verify this link"}
      </h1>
      <p role={state === "error" ? "alert" : "status"} className="text-text-sec mb-6">
        {state === "loading" ? "Please wait while we confirm your email address." : state === "success"
          ? "Your email address is confirmed. Continue to refresh your session or sign in to your account."
          : "This link may be expired, already used, or invalid. Request a new email, or sign in if you have already verified."}
      </p>
      {state !== "loading" && <a className="brand-button block rounded-xl p-3 font-bold" href={continuePath}>
        {state === "success" ? "Continue to IOPPS" : "Request a new verification email"}
      </a>}
    </section>
  </div>;
}

export function PasswordResetView({ state, continuePath, onSubmit }: { state: ResetState; continuePath: string; onSubmit: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-bg text-text">
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
      <Link href="/" className="text-teal text-xl font-extrabold tracking-widest">IOPPS</Link>
      <h1 className="text-2xl font-extrabold mt-6 mb-4">{state === "loading" ? "Checking your reset link" : state === "ready" ? "Choose a new password" : state === "success" ? "Password updated" : "This reset link is unavailable"}</h1>
      {state === "ready" && <form onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        if (password !== confirmation) { setError("Your passwords do not match."); return; }
        setBusy(true); setError("");
        try { await onSubmit(password); setPassword(""); setConfirmation(""); }
        catch { setError("We couldn’t update your password. Use a stronger password or request a new reset link."); }
        finally { setBusy(false); }
      }}>
        <label htmlFor="new-password" className="block mb-2 font-semibold">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border border-border bg-bg p-3 mb-4" aria-describedby="password-help" />
        <p id="password-help" className="text-text-sec mb-4">Use at least 8 characters.</p>
        <label htmlFor="confirm-password" className="block mb-2 font-semibold">Confirm new password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} className="w-full rounded-lg border border-border bg-bg p-3 mb-4" />
        {error && <p role="alert" className="text-text mb-4">{error}</p>}
        <button type="submit" disabled={busy} className="brand-button w-full rounded-xl p-3 font-bold">{busy ? "Updating password…" : "Update password"}</button>
      </form>}
      {state === "loading" && <p role="status">Please wait while we validate your link.</p>}
      {state === "error" && <p role="alert" className="mb-4">This link may be expired, already used, or invalid.</p>}
      {state === "success" ? <><p role="status" className="mb-4">Sign in with your new password.</p><a className="brand-button block rounded-xl p-3 text-center font-bold" href={continuePath}>Sign in</a></> : state !== "loading" && <Link className="block mt-4 text-teal underline" href="/forgot-password">Request a new reset link</Link>}
    </section>
  </div>;
}

export default function ActionContent() {
  const [state, setState] = useState<ResetState>("loading");
  const [continuePath, setContinuePath] = useState("/verify-email?next=%2Fsetup");
  const [isReset, setIsReset] = useState(false);
  const resetCode = useRef<string | null>(null);
  // Share one pending operation across Strict Mode effect replay.
  const pending = useRef<{ work: Promise<void>; destination: string; reset: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!pending.current) {
      const query = new URLSearchParams(window.location.search);
      const reset = query.get("mode") === "resetPassword";
      const destination = reset ? resetContinuePath(query.get("continueUrl"), window.location.origin) : verificationContinuePath(query.get("continueUrl"), window.location.origin);
      window.history.replaceState(window.history.state, "", window.location.pathname);
      pending.current = { destination, reset, work: reset
        ? validateResetAction(query, code => verifyPasswordResetCode(auth, code)).then(code => { resetCode.current = code; })
        : completeVerificationAction(query, { check: code => checkActionCode(auth, code), apply: code => applyActionCode(auth, code) }) };
    }
    const { work, destination, reset } = pending.current;
    setIsReset(reset);
    void work.then(() => { if (!cancelled) { setContinuePath(destination); setState(reset ? "ready" : "success"); } })
      .catch(() => { if (!cancelled) { setContinuePath(destination); setState("error"); } });
    return () => { cancelled = true; };
  }, []);
  if (isReset) return <PasswordResetView state={state} continuePath={continuePath} onSubmit={async password => {
    if (!resetCode.current) throw new Error("Reset link unavailable");
    await confirmPasswordReset(auth, resetCode.current, password);
    resetCode.current = null;
    setState("success");
  }} />;
  return <VerificationActionView state={state === "ready" ? "loading" : state} continuePath={continuePath} />;
}
