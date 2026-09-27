"use client";

import Link from "next/link";
import { useOrgWorkspace } from "@/lib/org-workspace-context";
import { PERSONAL_PROFILE_HREF } from "@/lib/account-navigation";

/** Makes it clear that dashboard actions are taken on behalf of the organization, not the person. */
export default function OrgWorkspaceBanner() {
  const workspace = useOrgWorkspace();
  if (!workspace) return null;
  return (
    <div
      role="note"
      aria-label="Current workspace"
      data-org-workspace-banner="true"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-2 text-sm md:px-10"
      style={{ background: "color-mix(in srgb, var(--teal) 8%, var(--card))", borderColor: "var(--border)", color: "var(--text-sec)" }}
    >
      <span className="min-w-0">
        Organization workspace · Acting as <strong className="text-text">{workspace.name}</strong>
      </span>
      <Link href={PERSONAL_PROFILE_HREF} className="font-semibold text-teal no-underline hover:underline">
        Switch to my personal profile
      </Link>
    </div>
  );
}
