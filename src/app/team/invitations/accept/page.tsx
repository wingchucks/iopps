"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
export default function AcceptInvitationPage() {
  const { user, loading } = useAuth();
  return <section className="max-w-lg mx-auto px-5 py-12 text-text"><h1 className="text-2xl font-bold mb-4">Join your colleague’s team</h1><p className="mb-5">Only accept a link you expected from an organization you trust. Your personal account stays yours; joining gives you access to that organization’s workspace.</p>{loading ? <p role="status">Checking your account…</p> : user ? <AcceptForm key={user.uid} user={user} /> : <p><Link href="/login" target="_blank" rel="noopener noreferrer" className="text-teal underline">Sign in in a new tab</Link> with the email that received this link, then return here. Keep this invitation tab open. If you need an account, use the sign-up option on the sign-in page.</p>}</section>;
}
function AcceptForm({ user }: { user: User }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [joined, setJoined] = useState("");
  const lifetime = useRef(new AbortController()), submitting = useRef(false);
  useEffect(() => { const controller = new AbortController(); lifetime.current = controller; return () => controller.abort(); }, [user]);
  async function accept() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    const signal = lifetime.current.signal;
    try {
      const invitation = window.location.hash.slice(1);
      if (!/^[a-f0-9]{64}\.[A-Za-z0-9_-]{43}$/.test(invitation)) throw new Error("This invitation link is incomplete. Ask the owner for a new link.");
      const idToken = await user.getIdToken(true); if (signal.aborted) return;
      const response = await fetch("/api/team/invitations/accept", { method: "POST", headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" }, signal, body: JSON.stringify({ token: invitation, confirm: true }) });
      const data = await response.json(); if (signal.aborted) return;
      if (!response.ok) throw new Error(data.error || "Unable to accept invitation");
      window.history.replaceState(null, "", window.location.pathname); setJoined(data.name);
    } catch (e) { if (!signal.aborted) setError(e instanceof Error ? e.message : "Unable to accept invitation"); }
    finally { if (!signal.aborted) { submitting.current = false; setBusy(false); } }
  }
  return joined ? <div><p role="status">You joined {joined}.</p><Link href="/org/dashboard" className="inline-block mt-5 min-h-11 px-4 py-3 rounded-xl bg-teal text-white font-semibold">Open organization dashboard</Link></div> : <div><p className="mb-4 break-all">Signed in as {user.email}. The owner’s invitation must match this verified email.</p><button disabled={busy} onClick={() => void accept()} className="min-h-11 px-5 rounded-xl bg-teal text-white font-semibold disabled:opacity-50">{busy ? "Joining…" : "Accept invitation and join"}</button>{error && <p role="alert" className="mt-4 text-error">{error}</p>}<p className="mt-4 text-sm text-text-muted">Wrong account? Sign out in another tab and sign in with the invited email before accepting.</p></div>;
}
