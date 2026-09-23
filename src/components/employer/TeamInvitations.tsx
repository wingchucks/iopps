"use client";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
type Invitation = { id: string; email: string; role: string; state: string; expiresAt: number };
const endpoint = "/api/employer/team/invitations";
export default function TeamInvitations() {
  const { user, loading } = useAuth();
  return !loading && user ? <InvitationForm key={user.uid} user={user} /> : null;
}
function InvitationForm({ user }: { user: User }) {
  const [email, setEmail] = useState(""), [role, setRole] = useState("member");
  const [invitations, setInvitations] = useState<Invitation[]>([]), [link, setLink] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const lifetime = useRef(new AbortController()), submitting = useRef(false), listGeneration = useRef(0), paging = useRef(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null), [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); lifetime.current = controller;
    const generation = ++listGeneration.current;
    (async () => {
      const token = await user.getIdToken(); if (controller.signal.aborted) return;
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Unable to load invitations");
      const data = await response.json(); if (!controller.signal.aborted && generation === listGeneration.current) { setInvitations(data.invitations); setNextCursor(data.nextCursor); }
    })().catch(() => { if (!controller.signal.aborted && generation === listGeneration.current) setError("Unable to load invitations. Reload to try again."); });
    return () => controller.abort();
  }, [user]);
  async function mutate(id?: string) {
    if (submitting.current || paging.current) return;
    submitting.current = true; setBusy(true); setError(""); setNotice(""); setLink("");
    const signal = lifetime.current.signal;
    try {
      const token = await user.getIdToken(); if (signal.aborted) return;
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const response = await fetch(endpoint, { method: id ? "PATCH" : "POST", headers, signal, body: JSON.stringify(id ? { id } : { email, role }) });
      const data = await response.json(); if (signal.aborted) return;
      if (!response.ok) throw new Error(data.error || "Unable to manage invitation");
      const generation = ++listGeneration.current;
      if (id) setNotice("Invitation revoked. That link can no longer be accepted.");
      else { setLink(new URL(data.path, window.location.origin).href); setNotice("Link created—share it with your colleague. No email was sent."); }
      const list = await fetch(endpoint, { headers, cache: "no-store", signal });
      if (!list.ok) throw new Error("The action succeeded, but the list could not refresh. Keep your created link and reload the list before repeating the action.");
      const updated = await list.json(); if (signal.aborted || generation !== listGeneration.current) return;
      setInvitations(updated.invitations); setNextCursor(updated.nextCursor);
    } catch (e) { if (!signal.aborted) setError(e instanceof Error ? e.message : "Unable to manage invitation"); }
    finally { if (!signal.aborted) { submitting.current = false; setBusy(false); } }
  }
  async function loadMore() {
    if (!nextCursor || submitting.current || paging.current) return;
    paging.current = true; setLoadingMore(true); setError("");
    const signal = lifetime.current.signal, generation = ++listGeneration.current;
    try {
      const token = await user.getIdToken(); if (signal.aborted) return;
      const response = await fetch(`${endpoint}?cursor=${encodeURIComponent(nextCursor)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal });
      if (!response.ok) throw new Error("Unable to load more invitations. Please try again.");
      const data = await response.json(); if (signal.aborted || generation !== listGeneration.current) return;
      setInvitations(previous => [...new Map([...previous, ...data.invitations].map(invite => [invite.id, invite])).values()]);
      setNextCursor(data.nextCursor);
    } catch (e) { if (!signal.aborted) setError(e instanceof Error ? e.message : "Unable to load invitations"); }
    finally { if (!signal.aborted) { paging.current = false; setLoadingMore(false); } }
  }
  return <section className="mt-8 p-5 rounded-2xl border border-border min-w-0" aria-labelledby="invite-title">
    <h2 id="invite-title" className="text-lg font-bold text-text">Invite a colleague</h2>
    <p className="text-sm text-text-muted my-2">Create a private link for their email. They must sign in with that verified email and choose to join. Links expire after 7 days. Creating another link for the same email replaces the old one.</p>
    <form onSubmit={event => { event.preventDefault(); void mutate(); }} className="flex flex-col gap-3">
      <label className="text-sm text-text">Colleague’s email<input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="block w-full min-h-11 rounded-lg border border-border bg-bg px-3" /></label>
      <label className="text-sm text-text">Access level<select value={role} onChange={event => setRole(event.target.value)} className="block w-full min-h-11 rounded-lg border border-border bg-bg px-3"><option value="member">Member</option><option value="admin">Admin</option></select></label>
      <p className="text-xs text-text-muted">Members can work with your organization’s jobs. Admins can also manage the business profile. Only the owner can invite or remove colleagues.</p>
      <button disabled={busy || loadingMore} className="min-h-11 rounded-xl px-4 bg-teal text-white font-semibold disabled:opacity-50">{busy ? "Working…" : "Create invite link"}</button>
    </form>
    {error && <p role="alert" className="text-error mt-3">{error}</p>}
    {notice && <p role="status" className="text-text mt-3">{notice}</p>}
    {link && <div className="mt-3"><label className="text-sm text-text">Private invitation link<textarea readOnly value={link} className="block w-full p-2 bg-bg text-text border border-border rounded-lg break-all" /></label><button type="button" className="min-h-11 text-teal font-semibold" onClick={async () => { try { await navigator.clipboard.writeText(link); setNotice("Link copied. Share it privately with your colleague."); } catch { setError("Select and copy the link above."); } }}>Copy link</button></div>}
    <ul className="mt-4 space-y-3">{invitations.map(invite => <li key={invite.id} className="flex flex-wrap items-center gap-3 text-sm text-text"><span className="min-w-0 break-all flex-1">{invite.email} — {invite.role} — {invite.state}</span>{invite.state === "pending" && <button type="button" disabled={busy || loadingMore} onClick={() => void mutate(invite.id)} className="min-h-11 px-3 border border-border rounded-lg text-error">Revoke invitation</button>}</li>)}</ul>
    {nextCursor && <button type="button" disabled={busy || loadingMore} onClick={() => void loadMore()} className="mt-3 min-h-11 px-4 rounded-lg border border-border text-teal">{loadingMore ? "Loading…" : "Load more invitations"}</button>}
  </section>;
}
