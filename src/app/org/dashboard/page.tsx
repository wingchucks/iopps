"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";
import type { MemberProfile } from "@/lib/firestore/members";
import { getOrganization } from "@/lib/firestore/organizations";
import type { Organization } from "@/lib/firestore/organizations";
import {
  getOrgPosts,
  createPost,
  updatePost,
  deletePost,
} from "@/lib/firestore/posts";
import type { Post, PostStatus } from "@/lib/firestore/posts";
import { getApplicationsByPost } from "@/lib/firestore/applications";

interface PostWithApps extends Post {
  applicationCount: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const emptyForm = {
  title: "",
  slug: "",
  type: "job" as const,
  description: "",
  location: "",
  salary: "",
  responsibilities: [""],
  qualifications: [""],
  benefits: [""],
  closingDate: "",
  status: "draft" as PostStatus,
};

type FormData = typeof emptyForm;

function ListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
        {label}
      </label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="px-2 rounded-lg border-none cursor-pointer text-sm font-semibold"
            style={{ background: "rgba(220,38,38,.1)", color: "#DC2626" }}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="text-sm font-semibold cursor-pointer border-none rounded-lg px-3 py-1.5"
        style={{ background: "rgba(13,148,136,.1)", color: "var(--teal)" }}
      >
        + Add {label.replace(/s$/, "")}
      </button>
    </div>
  );
}

function JobForm({
  initial,
  orgId,
  orgName,
  orgShort,
  onSave,
  onCancel,
}: {
  initial: FormData;
  orgId: string;
  orgName: string;
  orgShort: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const [saving, setSaving] = useState(false);
  const isEdit = initial.title !== "";

  const handleSubmit = async (publishStatus: PostStatus) => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const slug = form.slug || slugify(form.title);
      const data = {
        title: form.title,
        slug,
        type: form.type,
        description: form.description,
        location: form.location,
        salary: form.salary,
        responsibilities: form.responsibilities.filter((r) => r.trim()),
        qualifications: form.qualifications.filter((q) => q.trim()),
        benefits: form.benefits.filter((b) => b.trim()),
        closingDate: form.closingDate,
        status: publishStatus,
        orgId,
        orgName,
        orgShort,
      };
      if (isEdit) {
        await updatePost(slug, data);
      } else {
        await createPost(data);
      }
      onSave();
    } catch (err) {
      console.error("Failed to save post:", err);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof FormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Card className="p-6">
      <h3
        className="text-lg font-bold mb-4"
        style={{ color: "var(--text)" }}
      >
        {isEdit ? "Edit Job Posting" : "Create Job Posting"}
      </h3>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!isEdit) set("slug", slugify(e.target.value));
            }}
            placeholder="e.g. Senior Software Developer"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Slug
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="auto-generated-from-title"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            disabled={isEdit}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Toronto, ON"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Salary
            </label>
            <input
              type="text"
              value={form.salary}
              onChange={(e) => set("salary", e.target.value)}
              placeholder="e.g. $80,000 - $100,000"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Closing Date
          </label>
          <input
            type="date"
            value={form.closingDate}
            onChange={(e) => set("closingDate", e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe the role, team, and expectations..."
            rows={5}
            className="w-full px-3 py-2 rounded-lg text-sm resize-y"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>
        <ListEditor
          label="Responsibilities"
          items={form.responsibilities}
          onChange={(items) => set("responsibilities", items)}
        />
        <ListEditor
          label="Qualifications"
          items={form.qualifications}
          onChange={(items) => set("qualifications", items)}
        />
        <ListEditor
          label="Benefits"
          items={form.benefits}
          onChange={(items) => set("benefits", items)}
        />
        <div className="flex gap-3 pt-2">
          <Button
            primary
            onClick={() => handleSubmit("active")}
            className={saving ? "opacity-50 pointer-events-none" : ""}
          >
            {saving ? "Saving..." : "Publish"}
          </Button>
          <Button
            onClick={() => handleSubmit("draft")}
            className={saving ? "opacity-50 pointer-events-none" : ""}
          >
            Save as Draft
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status?: PostStatus }) {
  const colors: Record<string, { bg: string; color: string }> = {
    active: { bg: "rgba(16,185,129,.12)", color: "#10B981" },
    draft: { bg: "rgba(245,158,11,.12)", color: "#F59E0B" },
    closed: { bg: "rgba(107,114,128,.12)", color: "#6B7280" },
  };
  const s = status || "active";
  const c = colors[s] || colors.active;
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ background: c.bg, color: c.color }}
    >
      {s}
    </span>
  );
}

export default function OrgDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [posts, setPosts] = useState<PostWithApps[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const memberProfile = await getMemberProfile(user.uid);
      if (!memberProfile?.orgId) {
        router.replace("/feed");
        return;
      }
      setProfile(memberProfile);
      const [organization, orgPosts] = await Promise.all([
        getOrganization(memberProfile.orgId),
        getOrgPosts(memberProfile.orgId),
      ]);
      setOrg(organization);

      const postsWithApps: PostWithApps[] = await Promise.all(
        orgPosts.map(async (p) => {
          const apps = await getApplicationsByPost(p.id);
          return { ...p, applicationCount: apps.length };
        })
      );
      setPosts(postsWithApps);
      setLoading(false);
    })();
  }, [user, router]);

  const stats = useMemo(() => {
    const total = posts.length;
    const active = posts.filter((p) => (p.status || "active") === "active").length;
    const totalApps = posts.reduce((sum, p) => sum + p.applicationCount, 0);
    return { total, active, totalApps };
  }, [posts]);

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this posting?")) return;
    await deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setShowForm(true);
  };

  const handleToggleStatus = async (post: PostWithApps) => {
    const newStatus: PostStatus =
      (post.status || "active") === "active" ? "closed" : "active";
    await updatePost(post.id, { status: newStatus });
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, status: newStatus } : p))
    );
  };

  const handleFormSave = async () => {
    setShowForm(false);
    setEditingPost(null);
    if (!profile?.orgId) return;
    setLoading(true);
    const orgPosts = await getOrgPosts(profile.orgId);
    const postsWithApps: PostWithApps[] = await Promise.all(
      orgPosts.map(async (p) => {
        const apps = await getApplicationsByPost(p.id);
        return { ...p, applicationCount: apps.length };
      })
    );
    setPosts(postsWithApps);
    setLoading(false);
  };

  const formatDate = (ts: unknown): string => {
    if (!ts) return "N/A";
    if (typeof ts === "object" && ts !== null && "toDate" in ts) {
      return (ts as { toDate: () => Date }).toDate().toLocaleDateString();
    }
    return String(ts);
  };

  return (
    <ProtectedRoute>
      <NavBar />
      <div className="min-h-screen bg-bg">
        <div className="max-w-[1100px] mx-auto px-4 py-8 md:px-10">
          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="h-10 w-64 rounded-xl skeleton" />
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-2xl skeleton" />
                ))}
              </div>
              <div className="h-64 rounded-2xl skeleton" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {org?.name && (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: "var(--navy)" }}
                    >
                      {org.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h1
                      className="text-2xl font-bold"
                      style={{ color: "var(--text)" }}
                    >
                      {org?.name || "Organization"} Dashboard
                    </h1>
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Manage your job postings and applications
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Link href="/org/dashboard/profile">
                    <Button small>Edit Profile</Button>
                  </Link>
                  <Link href="/org/dashboard/analytics">
                    <Button small>Analytics</Button>
                  </Link>
                  <Link href="/org/dashboard/applications">
                    <Button small>View Applications</Button>
                  </Link>
                  <Button
                    primary
                    small
                    onClick={() => {
                      setEditingPost(null);
                      setShowForm(true);
                    }}
                  >
                    + Post a Job
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Total Posts", value: stats.total },
                  { label: "Active Posts", value: stats.active },
                  { label: "Applications", value: stats.totalApps },
                ].map(({ label, value }) => (
                  <Card key={label} className="p-5">
                    <p
                      className="text-sm font-semibold mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {label}
                    </p>
                    <p
                      className="text-3xl font-bold"
                      style={{ color: "var(--text)" }}
                    >
                      {value}
                    </p>
                  </Card>
                ))}
              </div>

              {/* Form */}
              {showForm && (
                <div className="mb-8">
                  <JobForm
                    initial={
                      editingPost
                        ? {
                            title: editingPost.title,
                            slug: editingPost.slug || editingPost.id,
                            type: "job" as const,
                            description: editingPost.description || "",
                            location: editingPost.location || "",
                            salary: editingPost.salary || "",
                            responsibilities: editingPost.responsibilities?.length
                              ? editingPost.responsibilities
                              : [""],
                            qualifications: editingPost.qualifications?.length
                              ? editingPost.qualifications
                              : [""],
                            benefits: editingPost.benefits?.length
                              ? editingPost.benefits
                              : [""],
                            closingDate: editingPost.closingDate || "",
                            status: editingPost.status || "draft",
                          }
                        : emptyForm
                    }
                    orgId={profile?.orgId || ""}
                    orgName={org?.name || ""}
                    orgShort={org?.shortName || ""}
                    onSave={handleFormSave}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingPost(null);
                    }}
                  />
                </div>
              )}

              {/* Posts list */}
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: "var(--text)" }}
              >
                Job Postings
              </h2>
              {posts.length === 0 ? (
                <Card className="p-8 text-center">
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No job postings yet. Click &quot;Post a Job&quot; to create
                    your first listing.
                  </p>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {posts.map((post) => (
                    <Card key={post.id} className="p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3
                              className="text-base font-bold truncate"
                              style={{ color: "var(--text)" }}
                            >
                              {post.title}
                            </h3>
                            <StatusBadge status={post.status} />
                          </div>
                          <div
                            className="flex items-center gap-4 text-xs flex-wrap"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {post.location && <span>{post.location}</span>}
                            <span>Posted: {formatDate(post.createdAt)}</span>
                            <span>
                              {post.applicationCount} application
                              {post.applicationCount !== 1 ? "s" : ""}
                            </span>
                            {post.closingDate && (
                              <span>Closes: {post.closingDate}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleStatus(post)}
                            className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                            style={{
                              background:
                                (post.status || "active") === "active"
                                  ? "rgba(107,114,128,.1)"
                                  : "rgba(16,185,129,.1)",
                              color:
                                (post.status || "active") === "active"
                                  ? "#6B7280"
                                  : "#10B981",
                            }}
                          >
                            {(post.status || "active") === "active"
                              ? "Close"
                              : "Reopen"}
                          </button>
                          <button
                            onClick={() => handleEdit(post)}
                            className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                            style={{
                              background: "rgba(13,148,136,.1)",
                              color: "var(--teal)",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                            style={{
                              background: "rgba(220,38,38,.1)",
                              color: "#DC2626",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
