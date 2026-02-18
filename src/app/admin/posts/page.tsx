"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminRoute from "@/components/AdminRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  getPosts,
  setPost,
  deletePost,
  type Post,
  type PostType,
} from "@/lib/firestore/posts";
import { getOrganizations, type Organization } from "@/lib/firestore/organizations";
import { serverTimestamp } from "firebase/firestore";

const postTypes: PostType[] = ["job", "event", "scholarship", "program", "story", "spotlight"];

const emptyPost = {
  type: "job" as PostType,
  title: "",
  orgId: "",
  orgName: "",
  orgShort: "",
  location: "",
  description: "",
  salary: "",
  jobType: "",
  deadline: "",
  featured: false,
  closingSoon: false,
  source: "",
  responsibilities: [] as string[],
  qualifications: [] as string[],
  benefits: [] as string[],
  dates: "",
  price: "",
  eventType: "",
  organizer: "",
  highlights: [] as string[],
  duration: "",
  credential: "",
  quote: "",
  community: "",
  badges: [] as string[],
  createdAt: null as unknown,
  order: 0,
};

export default function AdminPostsPage() {
  return (
    <AdminRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <PostManager />
      </div>
    </AppShell>
    </AdminRoute>
  );
}

function PostManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPost);
  const [formId, setFormId] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<PostType | "all">("all");

  const load = useCallback(async () => {
    try {
      const [p, o] = await Promise.all([getPosts(), getOrganizations()]);
      setPosts(p);
      setOrgs(o);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (post: Post) => {
    setEditing(post.id);
    setFormId(post.id);
    const { id, ...rest } = post;
    setForm({
      ...emptyPost,
      ...rest,
      responsibilities: rest.responsibilities || [],
      qualifications: rest.qualifications || [],
      benefits: rest.benefits || [],
      highlights: rest.highlights || [],
      badges: rest.badges || [],
    });
  };

  const startNew = () => {
    setEditing("new");
    setFormId("");
    setForm({ ...emptyPost, createdAt: serverTimestamp() });
  };

  const cancel = () => {
    setEditing(null);
    setForm({ ...emptyPost });
    setFormId("");
  };

  const handleSave = async () => {
    const id = editing === "new" ? formId.trim() : editing!;
    if (!id) return alert("ID is required");
    if (!form.title.trim()) return alert("Title is required");

    // Auto-fill org fields from selected orgId
    let finalForm = { ...form };
    if (form.orgId) {
      const org = orgs.find((o) => o.id === form.orgId);
      if (org) {
        finalForm = { ...finalForm, orgName: org.name, orgShort: org.shortName };
      }
    }
    if (editing === "new") {
      finalForm.createdAt = serverTimestamp();
    }

    setSaving(true);
    try {
      await setPost(id, finalForm);
      await load();
      cancel();
    } catch (err) {
      console.error("Failed to save:", err);
      alert("Failed to save. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete post "${id}"? This cannot be undone.`)) return;
    try {
      await deletePost(id);
      await load();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete. Check console.");
    }
  };

  const updateField = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const filtered =
    filterType === "all"
      ? posts
      : posts.filter((p) => p.type === filterType);

  const typeColors: Record<string, string> = {
    job: "var(--teal)",
    event: "var(--purple)",
    scholarship: "var(--gold)",
    program: "var(--blue)",
    story: "var(--green)",
    spotlight: "var(--navy)",
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
        <h2 className="text-2xl font-extrabold text-text flex-1">All Posts</h2>
        {!editing && (
          <Button
            primary
            small
            onClick={startNew}
            style={{ background: "var(--teal)" }}
          >
            + New Post
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      {!editing && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === "all"
                ? "bg-navy text-white"
                : "text-text-muted hover:bg-border/40"
            }`}
          >
            All ({posts.length})
          </button>
          {postTypes.map((t) => {
            const count = posts.filter((p) => p.type === t).length;
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  filterType === t
                    ? "bg-navy text-white"
                    : "text-text-muted hover:bg-border/40"
                }`}
              >
                {t}s ({count})
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <Card className="mb-6">
          <div style={{ padding: 20 }}>
            <h3 className="text-lg font-bold text-text mb-4">
              {editing === "new" ? "New Post" : `Edit: ${form.title || editing}`}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {editing === "new" && (
                <label className="block">
                  <span className="text-xs font-semibold text-text-sec mb-1 block">
                    Document ID
                  </span>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                    placeholder="e.g. job-casino-host"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Type
                </span>
                <select
                  value={form.type}
                  onChange={(e) => updateField("type", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                >
                  {postTypes.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Title
                </span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                  placeholder="Post title"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Organization
                </span>
                <select
                  value={form.orgId || ""}
                  onChange={(e) => updateField("orgId", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                >
                  <option value="">None</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Location
                </span>
                <input
                  type="text"
                  value={form.location || ""}
                  onChange={(e) => updateField("location", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                  placeholder="Saskatoon, SK"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Order
                </span>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => updateField("order", Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                />
              </label>

              {/* Job-specific fields */}
              {(form.type === "job" || form.type === "scholarship") && (
                <>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-sec mb-1 block">
                      Salary
                    </span>
                    <input
                      type="text"
                      value={form.salary || ""}
                      onChange={(e) => updateField("salary", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="$55,000-$65,000"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-sec mb-1 block">
                      Job Type
                    </span>
                    <input
                      type="text"
                      value={form.jobType || ""}
                      onChange={(e) => updateField("jobType", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="Full-Time"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-sec mb-1 block">
                      Deadline
                    </span>
                    <input
                      type="text"
                      value={form.deadline || ""}
                      onChange={(e) => updateField("deadline", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="Mar 15, 2026"
                    />
                  </label>
                </>
              )}

              {/* Event-specific fields */}
              {form.type === "event" && (
                <>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-sec mb-1 block">
                      Dates
                    </span>
                    <input
                      type="text"
                      value={form.dates || ""}
                      onChange={(e) => updateField("dates", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="Jul 18-20, 2026"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-sec mb-1 block">
                      Price
                    </span>
                    <input
                      type="text"
                      value={form.price || ""}
                      onChange={(e) => updateField("price", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="Free"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-sec mb-1 block">
                      Event Type
                    </span>
                    <input
                      type="text"
                      value={form.eventType || ""}
                      onChange={(e) => updateField("eventType", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="Cultural Festival"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-sec mb-1 block">
                      Organizer
                    </span>
                    <input
                      type="text"
                      value={form.organizer || ""}
                      onChange={(e) => updateField("organizer", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="Organizing body"
                    />
                  </label>
                </>
              )}

              {/* Program-specific fields */}
              {form.type === "program" && (
                <>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-sec mb-1 block">
                      Duration
                    </span>
                    <input
                      type="text"
                      value={form.duration || ""}
                      onChange={(e) => updateField("duration", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="2 Years"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-sec mb-1 block">
                      Credential
                    </span>
                    <input
                      type="text"
                      value={form.credential || ""}
                      onChange={(e) => updateField("credential", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="Diploma"
                    />
                  </label>
                </>
              )}

              {/* Checkboxes */}
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.featured || false}
                    onChange={(e) => updateField("featured", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-text-sec">Featured</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.closingSoon || false}
                    onChange={(e) => updateField("closingSoon", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-text-sec">Closing Soon</span>
                </label>
              </div>
            </div>

            <label className="block mb-4">
              <span className="text-xs font-semibold text-text-sec mb-1 block">
                Description
              </span>
              <textarea
                value={form.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal resize-none"
                placeholder="Post description..."
              />
            </label>

            {/* List fields for jobs */}
            {form.type === "job" && (
              <>
                <ListEditor
                  label="Responsibilities"
                  items={form.responsibilities}
                  onChange={(v) => updateField("responsibilities", v)}
                />
                <ListEditor
                  label="Qualifications"
                  items={form.qualifications}
                  onChange={(v) => updateField("qualifications", v)}
                />
                <ListEditor
                  label="Benefits"
                  items={form.benefits}
                  onChange={(v) => updateField("benefits", v)}
                />
              </>
            )}

            {/* List fields for events */}
            {form.type === "event" && (
              <ListEditor
                label="Highlights"
                items={form.highlights}
                onChange={(v) => updateField("highlights", v)}
              />
            )}

            <label className="block mb-4">
              <span className="text-xs font-semibold text-text-sec mb-1 block">
                Badges (comma-separated)
              </span>
              <input
                type="text"
                value={(form.badges || []).join(", ")}
                onChange={(e) =>
                  updateField(
                    "badges",
                    e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                  )
                }
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                placeholder="Featured, Closing Soon, New"
              />
            </label>

            <div className="flex gap-3">
              <Button onClick={cancel} style={{ borderRadius: 10 }}>
                Cancel
              </Button>
              <Button
                primary
                onClick={handleSave}
                style={{
                  background: "var(--teal)",
                  borderRadius: 10,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Post"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-border/40 shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-10">
          No posts found.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <Card key={post.id}>
              <div className="flex items-center gap-4" style={{ padding: 16 }}>
                <span
                  className="text-[10px] font-extrabold uppercase px-2 py-1 rounded"
                  style={{
                    background: `${typeColors[post.type] || "var(--navy)"}15`,
                    color: typeColors[post.type] || "var(--navy)",
                  }}
                >
                  {post.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-text m-0 truncate">
                    {post.title}
                  </p>
                  <p className="text-xs text-text-muted m-0">
                    {post.orgName || "No org"} &middot;{" "}
                    {post.location || "No location"} &middot; order: {post.order}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button small onClick={() => startEdit(post)}>
                    Edit
                  </Button>
                  <Button
                    small
                    onClick={() => handleDelete(post.id)}
                    style={{
                      color: "var(--red)",
                      borderColor: "rgba(220,38,38,.2)",
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [newItem, setNewItem] = useState("");

  const add = () => {
    if (!newItem.trim()) return;
    onChange([...items, newItem.trim()]);
    setNewItem("");
  };

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="mb-4">
      <span className="text-xs font-semibold text-text-sec mb-1 block">
        {label}
      </span>
      {items.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-text-sec bg-border/20 px-3 py-1.5 rounded-lg"
            >
              <span className="flex-1">{item}</span>
              <button
                onClick={() => remove(i)}
                className="text-red text-xs font-bold hover:text-red/80"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
          placeholder={`Add ${label.toLowerCase()}...`}
        />
        <Button small onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}
