"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDirectoryFilterActions } from "@/components/DirectoryPagination";

type Drafts = { q: string; location: string };
const same = (a: Drafts, b: Drafts) => a.q === b.q && a.location === b.location;

/** Inputs own immediate state; the URL owns committed filters, never keystrokes. */
export function useJobSearchDrafts() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const location = params.get("location") || "";
  const [drafts, setDrafts] = useState<Drafts>({ q, location });
  const latest = useRef(drafts);
  const written = useRef<Drafts | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateFilters = useDirectoryFilterActions();
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const flush = useCallback(() => {
    cancel();
    written.current = { ...latest.current };
    updateFilters(written.current);
  }, [cancel, updateFilters]);
  const edit = useCallback((key: keyof Drafts, value: string) => {
    latest.current = { ...latest.current, [key]: value };
    setDrafts(latest.current);
    cancel();
    timer.current = setTimeout(flush, 400);
  }, [cancel, flush]);
  const reset = useCallback((next: Drafts = { q: "", location: "" }) => {
    cancel();
    latest.current = next;
    written.current = next;
    setDrafts(next);
  }, [cancel]);
  useEffect(() => {
    const incoming = { q, location };
    // A delayed acknowledgement of our own write must not erase newer typing.
    if (written.current && same(incoming, written.current)) return;
    // URL navigation is authoritative and cancels drafts from the previous URL.
    // This synchronizes an external URL snapshot, not derived component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reset(incoming);
  }, [q, location, reset]);
  useEffect(() => {
    const navigate = () => {
      const current = new URLSearchParams(window.location.search);
      reset({ q: current.get("q") || "", location: current.get("location") || "" });
    };
    window.addEventListener("popstate", navigate);
    return () => { cancel(); window.removeEventListener("popstate", navigate); };
  }, [cancel, reset]);
  return { drafts, edit, flush, reset };
}
