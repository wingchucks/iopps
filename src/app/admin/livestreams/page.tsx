"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminRoute from "@/components/AdminRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
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

interface Livestream {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  description: string;
  scheduledDate: string;
  status: "scheduled" | "live" | "archived";
  viewCount: number;
  createdAt: unknown;
}

const emptyForm = {
  title: "",
  videoUrl: "",
  thumbnailUrl: "",
  description: "",
  scheduledDate: "",
  status: "scheduled" as Livestream["status"],
};

export default function AdminLivestreamsPage() {
  return (
    <AdminRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <LivestreamManager />
      </div>
    </AppShell>
    </AdminRoute>
  );
}

function LivestreamManager() {
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const q = query(collection(db, "livestreams"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setStreams(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Livestream)
      );
    } catch (err) {
      console.error("Failed to load livestreams:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "livestreams", editingId), { ...form });
        showToast("Livestream updated");
      } else {
        await addDoc(collection(db, "livestreams"), {
          ...form,
          viewCount: 0,
          createdAt: serverTimestamp(),
        });
        showToast("Livestream created");
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      console.error(err);
      showToast("Failed to save livestream", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: Livestream) => {
    setForm({
      title: s.title,
      videoUrl: s.videoUrl,
      thumbnailUrl: s.thumbnailUrl,
      description: s.description,
      scheduledDate: s.scheduledDate,
      status: s.status,
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleArchive = async (id: string) => {
    try {
      await updateDoc(doc(db, "livestreams", id), { status: "archived" });
      showToast("Livestream archived");
      await load();
    } catch {
      showToast("Failed to archive", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this livestream?")) return;
    try {
      await deleteDoc(doc(db, "livestreams", id));
      showToast("Livestream deleted");
      await load();
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  if (loading) return <PageSkeleton variant="grid" />;

  const total = streams.length;
  const active = streams.filter((s) => s.status === "live" || s.status === "scheduled").length;
  const archived = streams.filter((s) => s.status === "archived").length;

  const statusColor = (s: string) => {
    if (s === "live") return "#EF4444";
    if (s === "scheduled") return "#3B82F6";
    return "var(--text-muted)";
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <Link href="/admin" className="text-sm text-text-sec hover:underline mb-4 block">
        &larr; Back to Admin
      </Link>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-extrabold text-text">Livestreams</h2>
        <Button
          primary
          small
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Livestream"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Streams", value: total },
          { label: "Active", value: active },
          { label: "Archived", value: archived },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 16 }}>
            <p className="text-2xl font-extrabold text-text">{s.value}</p>
            <p className="text-xs text-text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6" style={{ padding: 20 }}>
          <h3 className="text-base font-bold text-text mb-4">
            {editingId ? "Edit Livestream" : "New Livestream"}
          </h3>
          <div className="flex flex-col gap-3">
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Video URL (YouTube/Vimeo embed)"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Thumbnail URL"
              value={form.thumbnailUrl}
              onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            />
            <textarea
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none resize-none"
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              />
              <select
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Livestream["status"] })
                }
              >
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <Button primary small onClick={handleSave} className={saving ? "opacity-60" : ""}>
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </Card>
      )}

      {/* List */}
      {streams.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-10">No livestreams yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {streams.map((s) => (
            <Card key={s.id} style={{ padding: 16 }}>
              <div className="flex gap-4 items-start">
                {/* Thumbnail placeholder */}
                <div
                  className="w-24 h-16 rounded-lg bg-bg flex items-center justify-center text-text-muted text-xl shrink-0"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {s.thumbnailUrl ? (
                    <img
                      src={s.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    "\u25B6"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-text text-sm truncate">{s.title}</p>
                    <Badge text={s.status} color={statusColor(s.status)} small />
                  </div>
                  <p className="text-xs text-text-muted mb-1 line-clamp-1">{s.description}</p>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span>{s.scheduledDate || "No date"}</span>
                    <span>{s.viewCount ?? 0} views</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(s)}
                    className="text-xs px-2 py-1 rounded-lg bg-bg border border-border text-text-sec hover:bg-card cursor-pointer"
                  >
                    Edit
                  </button>
                  {s.status !== "archived" && (
                    <button
                      onClick={() => handleArchive(s.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-bg border border-border text-text-sec hover:bg-card cursor-pointer"
                    >
                      Archive
                    </button>
                  )}
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
