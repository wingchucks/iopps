import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { apiRequest } from "./api";
import { db } from "./firebase";
import type { SavedJob } from "../types";

// Saved jobs are the website's saved_items records (src/lib/firestore/savedItems.ts),
// so a job saved on the phone is saved on iopps.ca too. firestore.rules lets members
// list, create and delete only their own; reads must filter on userId.

const text = (value: unknown) => (typeof value === "string" ? value : "");

function savesOf(uid: string, jobId: string) {
  return query(collection(db, "saved_items"), where("userId", "==", uid), where("postId", "==", jobId));
}

/** The member's saved jobs, newest first. */
export async function listSavedJobs(uid: string): Promise<SavedJob[]> {
  const snapshot = await getDocs(
    query(collection(db, "saved_items"), where("userId", "==", uid), orderBy("savedAt", "desc"))
  );
  return snapshot.docs
    .map((record) => ({ id: record.id, data: record.data() }))
    .filter(({ data }) => data.postType === "job" && text(data.postId))
    .map(({ id, data }) => ({
      id,
      jobId: text(data.postId),
      title: text(data.postTitle),
      employerName: text(data.postOrgName),
      savedAt: data.savedAt ?? null,
    }));
}

export async function isJobSaved(uid: string, jobId: string): Promise<boolean> {
  return !(await getDocs(savesOf(uid, jobId))).empty;
}

export async function saveJob(uid: string, job: { id: string; title?: string; employerName?: string }): Promise<void> {
  if (await isJobSaved(uid, job.id)) return;
  await setDoc(doc(db, "saved_items", `${uid}_${job.id}`), {
    userId: uid,
    postId: job.id,
    postTitle: job.title || "",
    postType: "job",
    ...(job.employerName ? { postOrgName: job.employerName } : {}),
    savedAt: serverTimestamp(),
  });
}

export async function unsaveJob(uid: string, jobId: string): Promise<void> {
  const snapshot = await getDocs(savesOf(uid, jobId));
  await Promise.all(snapshot.docs.map((record) => deleteDoc(record.ref)));
}

export type SavedJobState = "open" | "closed" | "unavailable";

/** Whether each saved job is still open, from the website (/api/saved/status). */
export async function savedJobStates(jobIds: string[]): Promise<Record<string, SavedJobState>> {
  const states: Record<string, SavedJobState> = {};
  for (let start = 0; start < jobIds.length; start += 100) {
    const { statuses } = await apiRequest<{ statuses?: Record<string, unknown> }>("/api/saved/status", {
      method: "POST",
      signedIn: true,
      body: { items: jobIds.slice(start, start + 100).map((postId) => ({ postId, postType: "job" })) },
    });
    for (const [jobId, state] of Object.entries(statuses ?? {})) {
      if (state === "open" || state === "closed" || state === "unavailable") states[jobId] = state;
    }
  }
  return states;
}
