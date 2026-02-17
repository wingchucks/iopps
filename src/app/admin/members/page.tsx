"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import {
  getAllMembers,
  updateMemberProfile,
  type MemberProfile,
} from "@/lib/firestore/members";

export default function AdminMembersPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <MemberManager />
      </div>
    </ProtectedRoute>
  );
}

function MemberManager() {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ displayName: "", community: "", location: "", bio: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAllMembers();
      setMembers(data);
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.displayName?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.community?.toLowerCase().includes(q) ||
      m.location?.toLowerCase().includes(q)
    );
  });

  const startEdit = (m: MemberProfile) => {
    setEditing(m.uid);
    setForm({
      displayName: m.displayName || "",
      community: m.community || "",
      location: m.location || "",
      bio: m.bio || "",
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateMemberProfile(editing, form);
      await load();
      setEditing(null);
    } catch (err) {
      console.error("Failed to update member:", err);
      alert("Failed to update. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (ts: unknown) => {
    if (!ts || typeof ts !== "object") return "Unknown";
    const d = ts as { seconds?: number };
    if (!d.seconds) return "Unknown";
    return new Date(d.seconds * 1000).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/admin"
          className="text-teal text-sm font-semibold hover:underline"
        >
          &larr; Admin
        </Link>
        <h2 className="text-2xl font-extrabold text-text flex-1">
          Members ({members.length})
        </h2>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
          placeholder="Search by name, email, community, or location..."
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <p className="text-text-muted text-sm">
            {search ? "No members match your search." : "No members found."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card key={m.uid}>
              {editing === m.uid ? (
                /* Edit mode */
                <div style={{ padding: 20 }}>
                  <p className="text-sm font-bold text-text mb-3">
                    Editing: {m.email}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-text-sec mb-1 block">
                        Display Name
                      </span>
                      <input
                        type="text"
                        value={form.displayName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, displayName: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-text-sec mb-1 block">
                        Community
                      </span>
                      <input
                        type="text"
                        value={form.community}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, community: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-text-sec mb-1 block">
                        Location
                      </span>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, location: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      />
                    </label>
                  </div>
                  <label className="block mb-3">
                    <span className="text-xs font-semibold text-text-sec mb-1 block">
                      Bio
                    </span>
                    <textarea
                      value={form.bio}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, bio: e.target.value }))
                      }
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal resize-none"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button small onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button
                      small
                      primary
                      onClick={handleSave}
                      style={{
                        background: "var(--teal)",
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div
                  className="flex items-center gap-4"
                  style={{ padding: 16 }}
                >
                  <Avatar
                    name={m.displayName || m.email || "?"}
                    size={44}
                    src={m.photoURL}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-[15px] text-text m-0 truncate">
                        {m.displayName || "No name"}
                      </p>
                      {m.community && (
                        <Badge
                          text={m.community}
                          color="var(--teal)"
                          bg="var(--teal-soft)"
                          small
                        />
                      )}
                    </div>
                    <p className="text-xs text-text-muted m-0">
                      {m.email}
                      {m.location && ` \u00B7 ${m.location}`}
                      {` \u00B7 Joined ${formatDate(m.joinedAt)}`}
                    </p>
                    {m.interests && m.interests.length > 0 && (
                      <p className="text-[11px] text-text-muted mt-0.5 m-0">
                        Interests: {m.interests.join(", ")}
                      </p>
                    )}
                  </div>
                  <Button small onClick={() => startEdit(m)}>
                    Edit
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
