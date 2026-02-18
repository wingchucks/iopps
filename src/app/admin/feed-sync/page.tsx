"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminRoute from "@/components/AdminRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import PageSkeleton from "@/components/PageSkeleton";
import { useToast } from "@/lib/toast-context";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface FeedSource {
  id: string;
  partnerName: string;
  careerPageUrl: string;
  syncFrequency: "daily" | "weekly";
  contentTypes: { jobs: boolean; events: boolean; scholarships: boolean };
  active: boolean;
  lastSyncedAt: unknown;
  syncCount: number;
  createdAt: unknown;
}

const emptyForm = {
  partnerName: "",
  careerPageUrl: "",
  syncFrequency: "daily" as FeedSource["syncFrequency"],
  contentTypes: { jobs: true, events: false, scholarships: false },
};

export default function AdminFeedSyncPage() {
  return (
    <AdminRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <FeedSyncManager />
      </div>
    </AppShell>
    </AdminRoute>
  );
}

function FeedSyncManager() {
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const q = query(collection(db, "feed_sources"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setSources(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FeedSource)
      );
    } catch (err) {
      console.error("Failed to load feed sources:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.partnerName.trim() || !form.careerPageUrl.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "feed_sources", editingId), { ...form });
        showToast("Source updated");
      } else {
        await addDoc(collection(db, "feed_sources"), {
          ...form,
          active: true,
          lastSyncedAt: null,
          syncCount: 0,
          createdAt: serverTimestamp(),
        });
        showToast("Source added");
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      console.error(err);
      showToast("Failed to save source", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: FeedSource) => {
    setForm({
      partnerName: s.partnerName,
      careerPageUrl: s.careerPageUrl,
      syncFrequency: s.syncFrequency,
      contentTypes: s.contentTypes ?? { jobs: true, events: false, scholarships: false },
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const toggleActive = async (s: FeedSource) => {
    try {
      await updateDoc(doc(db, "feed_sources", s.id), { active: !s.active });
      showToast(s.active ? "Source paused" : "Source activated");
      await load();
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this feed source?")) return;
    try {
      await deleteDoc(doc(db, "feed_sources", id));
      showToast("Source deleted");
      await load();
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  if (loading) return <PageSkeleton variant="list" />;

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <Link href="/admin" className="text-sm text-text-sec hover:underline mb-4 block">
        &larr; Back to Admin
      </Link>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-extrabold text-text">Feed Sync</h2>
        <Button
          primary
          small
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Source"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6" style={{ padding: 20 }}>
          <h3 className="text-base font-bold text-text mb-4">
            {editingId ? "Edit Source" : "New Feed Source"}
          </h3>
          <div className="flex flex-col gap-3">
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Partner Name"
              value={form.partnerName}
              onChange={(e) => setForm({ ...form, partnerName: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Career Page URL"
              value={form.careerPageUrl}
              onChange={(e) => setForm({ ...form, careerPageUrl: e.target.value })}
            />
            <select
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              value={form.syncFrequency}
              onChange={(e) =>
                setForm({ ...form, syncFrequency: e.target.value as FeedSource["syncFrequency"] })
              }
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <div className="flex gap-4 text-sm text-text">
              <span className="text-text-muted text-xs mr-1">Import:</span>
              {(["jobs", "events", "scholarships"] as const).map((ct) => (
                <label key={ct} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.contentTypes[ct]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        contentTypes: { ...form.contentTypes, [ct]: e.target.checked },
                      })
                    }
                    className="accent-[var(--navy)]"
                  />
                  <span className="capitalize text-xs">{ct}</span>
                </label>
              ))}
            </div>
            <Button primary small onClick={handleSave} className={saving ? "opacity-60" : ""}>
              {saving ? "Saving..." : editingId ? "Update" : "Add Source"}
            </Button>
          </div>
        </Card>
      )}

      {/* List */}
      {sources.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-10">No feed sources configured.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sources.map((s) => (
            <Card key={s.id} style={{ padding: 16 }}>
              <div className="flex gap-4 items-center">
                {/* Status dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: s.active ? "#22C55E" : "var(--text-muted)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text text-sm truncate">{s.partnerName}</p>
                  <p className="text-xs text-text-muted truncate">{s.careerPageUrl}</p>
                  <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                    <span>Sync: {s.syncFrequency}</span>
                    <span>{s.syncCount ?? 0} synced</span>
                    <span>
                      Last:{" "}
                      {s.lastSyncedAt
                        ? new Date((s.lastSyncedAt as { seconds: number }).seconds * 1000).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(s)}
                    className={`text-xs px-2 py-1 rounded-lg border cursor-pointer ${
                      s.active
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-bg border-border text-text-muted"
                    }`}
                  >
                    {s.active ? "Active" : "Paused"}
                  </button>
                  <button
                    onClick={() => handleEdit(s)}
                    className="text-xs px-2 py-1 rounded-lg bg-bg border border-border text-text-sec hover:bg-card cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs px-2 py-1 rounded-lg text-red-500 bg-bg border border-border hover:bg-red-50 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
