"use client";

import { useEffect, useRef, useState } from "react";
import type { reviewAssignment, applyAssignment } from "@/lib/server/organization-admin-assignment";

type Review = Awaited<ReturnType<typeof reviewAssignment>>;
type Result = Awaited<ReturnType<typeof applyAssignment>>;
const value = (input: unknown) => input == null || input === "" ? "None" : String(input);

export default function OrganizationAdminAssignment({orgId,getToken,onApplied}: {
  orgId:string; getToken:()=>Promise<string>; onApplied:()=>Promise<void>;
}) {
  const [email,setEmail] = useState("");
  const [role,setRole] = useState("");
  const [enable,setEnable] = useState(false);
  const [review,setReview] = useState<Review | null>(null);
  const [confirmation,setConfirmation] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [result,setResult] = useState<Result | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (review) { dialog.current?.showModal(); restoreFocus.current = true; }
    else if (!busy && restoreFocus.current) { reviewButton.current?.focus(); restoreFocus.current = false; }
  },[review,busy]);

  async function send(body: Record<string,unknown>) {
    const token = await getToken();
    const response = await fetch(`/api/admin/employers/${encodeURIComponent(orgId)}/administrator`,{
      method:"POST",cache:"no-store",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Assignment request failed");
    return payload;
  }
  async function requestReview() {
    setBusy(true); setError(""); setResult(null);
    try {
      const next = await send({action:"review",email,orgId,role,enable}) as Review;
      setConfirmation(""); setReview(next);
    } catch (err) { setError(err instanceof Error ? err.message : "Review failed"); }
    finally { setBusy(false); }
  }
  function close() {
    if (busy) return;
    dialog.current?.close(); setReview(null); setConfirmation(""); setError("");
  }
  async function apply() {
    if (!review || confirmation !== review.confirmation || busy) return;
    setBusy(true); setError("");
    try {
      const next = await send({...review.desired,action:"apply",token:review.token,confirmation}) as Result;
      if (next.verified !== true) throw new Error("Readback was not verified. Inspect before making another assignment.");
      setResult(next); dialog.current?.close(); setReview(null); setConfirmation("");
      await onApplied();
    } catch (err) { setError(err instanceof Error ? err.message : "Apply could not be verified. Retry this confirmation."); }
    finally { setBusy(false); }
  }
  const inputClass = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-text focus-visible:outline-2 focus-visible:outline-teal";
  return <section className="mt-5 border-t border-border pt-5" aria-labelledby="assignment-title">
    <h3 id="assignment-title" className="font-semibold">Assign organization administrator</h3>
    <p className="mt-2 text-sm text-text-sec">Link an existing user to this organization. Existing owners, platform roles, billing and content are preserved.</p>
    <form className="mt-4 space-y-3" onSubmit={event=>{event.preventDefault();void requestReview();}}>
      <p className="break-all text-sm">Organization ID: <strong>{orgId}</strong></p>
      <label className="block text-sm">Exact existing user email
        <input className={inputClass} type="email" autoComplete="off" maxLength={254} required value={email} disabled={busy || !!review} onChange={e=>setEmail(e.target.value)} />
      </label>
      <label className="block text-sm">Organization role
        <select aria-label="Organization role" className={inputClass} required value={role} disabled={busy || !!review} onChange={e=>setRole(e.target.value)}>
          <option value="">Select a role</option><option value="admin">Organization administrator</option>
        </select>
      </label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={enable} disabled={busy || !!review} onChange={e=>setEnable(e.target.checked)} />Enable this organization as part of this assignment</label>
      <p className="text-xs text-text-muted">Disabled organizations require explicit enabling. If enabling would make a profile public, public visibility is set to hidden on both organization records. The review shows this change.</p>
      <button ref={reviewButton} className="rounded-lg button-gradient px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy || !!review || !role} type="submit">{busy && !review ? "Reviewing…" : "Review assignment"}</button>
    </form>
    {error && !review && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
    {result && <div role="status" className="mt-4 rounded-lg border border-border p-3 text-sm">
      <p className="font-semibold">Assignment verified by independent readback{result.replayed ? " (safe retry)" : ""}.</p>
      <p className="break-all">User: {result.uid} · Organization: {result.orgId}</p>
      <p>User role: {value(result.readback.userOrgRole)} · Member role: {value(result.readback.memberOrgRole)}</p>
      <p>Employer disabled: {value(result.readback.employerDisabled)} · Organization disabled: {value(result.readback.organizationDisabled)}</p>
    </div>}
    <dialog ref={dialog} aria-labelledby="assignment-review-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 text-text backdrop:bg-black/60" onCancel={e=>{e.preventDefault();close();}}>
      {review && <>
        <h3 id="assignment-review-title" className="text-lg font-semibold">Confirm organization administrator assignment</h3>
        <p className="mt-2 break-all text-sm">{review.email} · User ID: {review.uid}</p>
        <p className="break-all text-sm">Organization ID: {review.orgId}</p>
        <p className="mt-2 text-xs text-text-muted">Review expires {new Date(review.expiresAt).toLocaleTimeString()}. Changes after review require a new review.</p>
        <div className="my-4 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr><th className="p-2">Setting</th><th className="p-2">Current</th><th className="p-2">Desired</th></tr></thead>
          <tbody>{[
            ["User organization",review.current.userOrgId,review.orgId],
            ["Employer link",review.current.employerId,review.orgId],
            ["Member organization",review.current.memberOrgId,review.orgId],
            ["User organization role",review.current.userOrgRole,"admin"],
            ["Member organization role",review.current.memberOrgRole,"admin"],
            ["Employer disabled",review.current.employerDisabled,review.desired.enable ? false : review.current.employerDisabled],
            ["Organization disabled",review.current.organizationDisabled,review.desired.enable ? false : review.current.organizationDisabled],
            ["Employer status",review.current.employerStatus,review.changes.employer?.status ?? review.current.employerStatus],
            ["Organization status",review.current.organizationStatus,review.changes.organization?.status ?? review.current.organizationStatus],
            ["Employer public visibility",review.current.employerPublicVisibility,review.changes.employer?.publicVisibility ?? review.current.employerPublicVisibility],
            ["Organization public visibility",review.current.organizationPublicVisibility,review.changes.organization?.publicVisibility ?? review.current.organizationPublicVisibility],
            ["Platform role",review.current.platformRole,review.current.platformRole],
            ["Member platform role",review.current.memberPlatformRole,review.current.memberPlatformRole],
            ["Employer owner",review.current.ownerId,review.current.ownerId],
            ["Organization owner",review.current.organizationOwnerId,review.current.organizationOwnerId],
            ["Employer ownership UID",review.current.employerUid,review.current.employerUid],
            ["Organization ownership UID",review.current.organizationUid,review.current.organizationUid],
          ].map(([label,current,desired])=><tr key={String(label)} className="border-t border-border"><th className="p-2 font-normal">{value(label)}</th><td className="break-all p-2">{value(current)}</td><td className="break-all p-2">{value(desired)}</td></tr>)}</tbody>
        </table></div>
        <label className="block text-sm">Type this exact confirmation:
          <span className="my-2 block break-all rounded-lg bg-bg p-2 font-mono text-xs">{review.confirmation}</span>
          <input aria-label="Exact assignment confirmation" className={inputClass} autoComplete="off" value={confirmation} disabled={busy} onChange={e=>setConfirmation(e.target.value)} />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={close} disabled={busy} className="rounded-lg button-gradient-soft border border-border px-4 py-2 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={()=>void apply()} disabled={busy || confirmation !== review.confirmation} className="rounded-lg button-gradient px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Applying and verifying…" : "Confirm assignment"}</button>
        </div>
      </>}
    </dialog>
  </section>;
}
