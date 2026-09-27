"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import {
  CREATE_ORGANIZATION_HREF,
  PERSONAL_PROFILE_HREF,
  describeWorkspace,
  type AccountWorkspace,
  type OrganizationWorkspaceLinks,
} from "@/lib/account-navigation";

export default function AccountAvatarMenu({ name, src, size = 36, organization = null, workspace = "personal", showCreateOrganization = false, onSignOut }: {
  name: string; src?: string | null; size?: number;
  /** The organization workspace this login can manage, shown alongside the personal profile. */
  organization?: OrganizationWorkspaceLinks | null;
  workspace?: AccountWorkspace;
  showCreateOrganization?: boolean;
  onSignOut: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const focusLast = useRef(false);
  useEffect(() => {
    if (!open) return;
    const items = menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[focusLast.current ? items.length - 1 : 0]?.focus();
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div ref={container} style={{ position: "relative" }} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === "Escape" && open) {
      event.preventDefault(); setOpen(false); trigger.current?.focus();
    }
  }}>
    <button ref={trigger} type="button" aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} aria-controls={id}
      onClick={() => { focusLast.current = false; setOpen(value => !value); }} onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); focusLast.current = event.key === "ArrowUp"; setOpen(true); }
      }} className="rounded-xl border-0 p-0 cursor-pointer bg-transparent">
      <Avatar name={name} size={size} src={src || undefined} />
    </button>
    {open && <div ref={menu} id={id} role="menu" aria-label="Account" onKeyDown={event => {
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (index + 1) % items.length : event.key === "ArrowUp" ? (index + items.length - 1) % items.length : -1;
      if (next >= 0) { event.preventDefault(); items[next]?.focus(); }
    }} style={{ position: "absolute", right: 0, top: "100%", zIndex: 60, minWidth: 220, maxWidth: "calc(100vw - 32px)", padding: 8, borderRadius: 12, background: "var(--card, white)", color: "var(--text, #111)", boxShadow: "0 4px 24px #0003" }}>
      <p data-account-workspace={workspace} className="m-0 px-3 pt-2 pb-1 text-xs font-semibold text-text-muted truncate">{describeWorkspace(workspace, organization)}</p>
      <Link role="menuitem" tabIndex={-1} href={PERSONAL_PROFILE_HREF} onClick={() => setOpen(false)} className="block p-3 rounded-lg no-underline text-text">My Profile</Link>
      <Link role="menuitem" tabIndex={-1} href="/settings/account" onClick={() => setOpen(false)} className="block p-3 rounded-lg no-underline text-text">Account Settings</Link>
      {organization ? <div role="group" aria-label={`Organization: ${organization.name}`} className="border-t border-[var(--border)] mt-1 pt-1">
        <p aria-hidden="true" className="m-0 px-3 pt-2 text-xs font-semibold text-text-muted truncate">{organization.name}</p>
        <Link role="menuitem" tabIndex={-1} href={organization.dashboardHref} onClick={() => setOpen(false)} className="block p-3 rounded-lg no-underline text-text">Organization Dashboard</Link>
        {organization.publicHref && <Link role="menuitem" tabIndex={-1} href={organization.publicHref} onClick={() => setOpen(false)} className="block p-3 rounded-lg no-underline text-text">Public Organization Page</Link>}
      </div> : showCreateOrganization && <Link role="menuitem" tabIndex={-1} href={CREATE_ORGANIZATION_HREF} onClick={() => setOpen(false)} className="block p-3 rounded-lg no-underline text-text">Create an Organization</Link>}
      <button role="menuitem" tabIndex={-1} type="button" onClick={() => { setOpen(false); void onSignOut(); }} className="block w-full p-3 text-left rounded-lg border-0 cursor-pointer">Sign Out</button>
    </div>}
  </div>;
}
