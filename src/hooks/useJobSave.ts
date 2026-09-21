"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { buildLoginRedirectHref } from "@/lib/utils";
import { isJobSaved, saveJob, unsaveJob } from "@/lib/firestore/savedItems";
import { createJobSaveSession } from "@/lib/job-save-session";

type SaveJob = { id: string; title: string; employerName?: string; orgName?: string };
type State = { scope: string; saved: boolean; saving: boolean; error: string };

/** Guests sign in before saving; the URL intent survives a failed/offline write. */
export function useJobSave(job: SaveJob | null) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() || "";
  const uid = user?.uid || "";
  const id = job?.id || "";
  const title = job?.title || "";
  const org = job?.employerName || job?.orgName || "";
  const scope = JSON.stringify([uid, id]);
  const [state, setState] = useState<State>({ scope: "", saved: false, saving: false, error: "" });
  const current = useRef<{ scope: string; run: (remove?: boolean) => Promise<void> } | null>(null);
  // Pin automatic intent to the first account handling it, not a later account.
  const intentOwner = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !uid || !id) return;
    let active = true;
    const update = (patch: Partial<State>) => {
      if (active) setState(previous => ({ ...(previous.scope === scope ? previous : { saved: false, saving: false, error: "" }), scope, ...patch }));
    };
    const session = createJobSaveSession({
      read: () => isJobSaved(uid, id),
      add: () => saveJob(uid, id, title, org),
      remove: () => unsaveJob(uid, id),
      changed: saved => update({ saved, error: "" }),
      failed: () => update({ error: "Couldn't update saved jobs. Please try again." }),
    });
    const wantsSave = new URLSearchParams(queryString).get("save") === "1";
    const run = async (remove = false) => {
      update({ saving: true, error: "" });
      const persisted = await session.save(remove);
      if (!active) return;
      update({ saving: false });
      if (persisted && wantsSave) {
        const clean = new URLSearchParams(queryString);
        clean.delete("save");
        router.replace(`${pathname}${clean.size ? `?${clean}` : ""}`);
      }
    };
    current.current = { scope, run };
    void session.load();
    if (wantsSave && (!intentOwner.current || intentOwner.current === uid)) {
      intentOwner.current = uid;
      void run();
    }
    return () => { active = false; session.dispose(); current.current = null; };
  }, [loading, uid, id, title, org, scope, queryString, pathname, router]);

  const saved = state.scope === scope && state.saved;
  const handleSave = async () => {
    if (loading || !job) return;
    if (!uid) {
      const query = new URLSearchParams(queryString);
      query.set("save", "1");
      router.push(buildLoginRedirectHref(`${pathname}?${query}`));
      return;
    }
    if (current.current?.scope !== scope) return;
    // Login return is save-only, never a toggle which could remove an old save.
    await current.current.run(new URLSearchParams(queryString).get("save") === "1" ? false : saved);
  };
  return { saved, saving: loading || (state.scope === scope && state.saving), saveError: state.scope === scope ? state.error : "", handleSave };
}
