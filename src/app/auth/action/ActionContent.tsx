"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { completeVerificationAction, verificationContinuePath } from "./verification-action";

type State = "loading" | "success" | "error";

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

export default function ActionContent() {
  const [state, setState] = useState<State>("loading");
  const [continuePath, setContinuePath] = useState("/verify-email?next=%2Fsetup");
  // Strict Mode effect replay must not consume a single-use code twice.
  const pending = useRef<{ work: Promise<void>; destination: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!pending.current) {
      const query = new URLSearchParams(window.location.search);
      const destination = verificationContinuePath(query.get("continueUrl"), window.location.origin);
      // Do not retain action codes in navigation history or subsequent referrers.
      window.history.replaceState(window.history.state, "", window.location.pathname);
      pending.current = { destination, work: completeVerificationAction(query, {
        check: code => checkActionCode(auth, code),
        apply: code => applyActionCode(auth, code),
      }) };
    }
    const { work, destination } = pending.current;
    void work.then(() => { if (!cancelled) { setContinuePath(destination); setState("success"); } })
      .catch(() => { if (!cancelled) { setContinuePath(destination); setState("error"); } });
    return () => { cancelled = true; };
  }, []);
  return <VerificationActionView state={state} continuePath={continuePath} />;
}
