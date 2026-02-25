"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
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
import { displayLocation } from "@/lib/utils";
import { doc, getDoc, getDocFromServer, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import OrgDashboardNav from "@/components/OrgDashboardNav";

interface PostWithApps extends Post {
  applicationCount: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const JOB_CATEGORIES = [
  "Administration", "Agriculture", "Arts & Culture", "Business",
  "Construction & Trades", "Education", "Environment & Land",
  "Finance", "Government & Public Service", "Health & Wellness",
  "Hospitality & Tourism", "Human Resources", "Information Technology",
  "Legal", "Management", "Marketing & Communications",
  "Natural Resources", "Social Services", "Transportation", "Other",
];

const emptyForm = {
  title: "",
  slug: "",
  type: "job" as const,
  description: "",
  location: "",
  salary: "",
  employmentType: "",
  workLocation: "",
  positions: "1",
  category: "",
  externalApplyUrl: "",
  requiresResume: true,
  requiresCoverLetter: false,
  requiresReferences: false,
  featured: false,
  responsibilities: [""],
  qualifications: [""],
  benefits: [""],
  closingDate: "",
  willTrain: false,
  driversLicense: false,
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
        + Add {label.replace(/ies$/, "y").replace(/s$/, "")}
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
  forceCreate,
}: {
  initial: FormData;
  orgId: string;
  orgName: string;
  orgShort: string;
  onSave: () => void;
  onCancel: () => void;
  forceCreate?: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const [saving, setSaving] = useState(false);
  const isEdit = !forceCreate && initial.title !== "";

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
        employmentType: form.employmentType,
        workLocation: form.workLocation,
        positions: form.positions,
        category: form.category,
        externalApplyUrl: form.externalApplyUrl,
        requiresResume: form.requiresResume,
        requiresCoverLetter: form.requiresCoverLetter,
        requiresReferences: form.requiresReferences,
        featured: form.featured,
        willTrain: form.willTrain,
        driversLicense: form.driversLicense,
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Employment Type
            </label>
            <select
              value={form.employmentType}
              onChange={(e) => set("employmentType", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="">Select type...</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Casual</option>
              <option>Seasonal</option>
              <option>Internship</option>
              <option>Volunteer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Work Location
            </label>
            <select
              value={form.workLocation}
              onChange={(e) => set("workLocation", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="">Select...</option>
              <option>On-site</option>
              <option>Hybrid</option>
              <option>Remote</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Job Category
            </label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="">Select category...</option>
              {JOB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Number of Openings
            </label>
            <select
              value={form.positions}
              onChange={(e) => set("positions", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="1">1 position</option>
              <option value="2">2 positions</option>
              <option value="3">3 positions</option>
              <option value="4">4 positions</option>
              <option value="5">5 positions</option>
              <option value="5+">5+ positions</option>
            </select>
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
            External Apply URL <span className="font-normal text-text-sec">(optional — skip IOPPS apply form)</span>
          </label>
          <input
            type="url"
            value={form.externalApplyUrl}
            onChange={(e) => set("externalApplyUrl", e.target.value)}
            placeholder="https://careers.yourorg.com/apply/..."
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        {/* Job Options */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Job Options</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.willTrain} onChange={(e) => set("willTrain", e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Will Train</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.driversLicense} onChange={(e) => set("driversLicense", e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Driver&apos;s License Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium" style={{ color: "var(--amber, #D97706)" }}>⭐ Feature This Job</span>
            </label>
          </div>
        </div>
        {/* Required Documents */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Required from Applicants</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.requiresResume} onChange={(e) => set("requiresResume", e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Resume / CV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.requiresCoverLetter} onChange={(e) => set("requiresCoverLetter", e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Cover Letter</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.requiresReferences} onChange={(e) => set("requiresReferences", e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>References</span>
            </label>
          </div>
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
  return (
    <Suspense>
      <OrgDashboardContent />
    </Suspense>
  );
}

function OrgDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [posts, setPosts] = useState<PostWithApps[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Auto-open job form when ?create=job is in URL
  useEffect(() => {
    if (searchParams.get("create") === "job") {
      setEditingPost(null);
      setIsDuplicating(false);
      setShowForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Use server-side API to avoid Firestore client offline issues
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/employer/dashboard", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile as MemberProfile);
          setOrg(data.org as Organization);

          // Merge jobs and posts
          const allItems = [...(data.jobs || []), ...(data.posts || [])];
          setPosts(allItems as PostWithApps[]);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("[OrgDashboard] API fetch failed, trying client-side:", err);
      }

      // Fallback: client-side Firestore (for non-employer orgs)
      const memberProfile = await getMemberProfile(user.uid);
      if (!memberProfile?.orgId) return;
      setProfile(memberProfile);

      const [organization, orgPosts] = await Promise.all([
        getOrganization(memberProfile.orgId),
        getOrgPosts(memberProfile.orgId),
      ]);
      setOrg(organization);

      const postsWithApps: PostWithApps[] = await Promise.all(
        orgPosts.map(async (p) => {
          try {
            const apps = await getApplicationsByPost(p.id);
            return { ...p, applicationCount: apps.length };
          } catch {
            return { ...p, applicationCount: 0 };
          }
        })
      );
      setPosts(postsWithApps);
      setLoading(false);
    })();
  }, [user, router]);

  const [pendingApps, setPendingApps] = useState(0);

  const stats = useMemo(() => {
    const total = posts.length;
    const active = posts.filter((p) => (p.status || "active") === "active").length;
    const totalApps = posts.reduce((sum, p) => sum + p.applicationCount, 0);
    return { total, active, totalApps };
  }, [posts]);

  // Count pending (submitted) applications for nav badge
  useEffect(() => {
    if (!profile?.orgId) return;
    (async () => {
      let pending = 0;
      for (const post of posts) {
        try {
          const apps = await getApplicationsByPost(post.id);
          pending += apps.filter((a) => a.status === "submitted").length;
        } catch { /* ignore */ }
      }
      setPendingApps(pending);
    })();
  }, [posts, profile?.orgId]);

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this posting?")) return;
    await deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setIsDuplicating(false);
    setShowForm(true);
  };

  const handleDuplicate = (post: Post) => {
    const cloned = {
      ...post,
      id: "",
      title: `Copy of ${post.title}`,
      slug: slugify(`copy-of-${post.title}-${Date.now()}`),
      status: "draft" as PostStatus,
    };
    setEditingPost(cloned as Post);
    setIsDuplicating(true);
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

    // Refresh from both org posts and jobs collection
    const orgPosts = await getOrgPosts(profile.orgId);
    let allPosts = orgPosts;
    if (orgPosts.length === 0) {
      const jobsQuery = query(collection(db, "jobs"), where("employerId", "==", profile.orgId));
      const jobsSnap = await getDocs(jobsQuery);
      allPosts = jobsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "",
          slug: data.slug || d.id,
          type: "job" as const,
          description: data.description || "",
          location: data.location || "",
          salary: data.salary || data.salaryRange || "",
          status: (data.status || "active") as PostStatus,
          orgId: profile.orgId,
          orgName: org?.name || "",
          authorId: user?.uid || "",
          authorName: user?.displayName || "",
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        } as unknown as Post;
      });
    }

    const postsWithApps: PostWithApps[] = await Promise.all(
      allPosts.map(async (p) => {
        try {
          const apps = await getApplicationsByPost(p.id);
          return { ...p, applicationCount: apps.length };
        } catch {
          return { ...p, applicationCount: 0 };
        }
      })
    );
    setPosts(postsWithApps);
    setLoading(false);
  };

  const formatDate = (ts: unknown): string => {
    if (!ts) return "N/A";
    if (typeof ts === "string") return new Date(ts).toLocaleDateString();
    if (typeof ts === "object" && ts !== null) {
      if ("toDate" in ts) {
        return (ts as { toDate: () => Date }).toDate().toLocaleDateString();
      }
      if ("_seconds" in ts) {
        return new Date((ts as { _seconds: number })._seconds * 1000).toLocaleDateString();
      }
    }
    return "N/A";
  };

  return (
    <OrgRoute>
      <AppShell>
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
                <OrgDashboardNav
                  orgSlug={org?.slug}
                  pendingApps={pendingApps}
                  onPostJob={() => {
                    setEditingPost(null);
                    setIsDuplicating(false);
                    setShowForm(true);
                  }}
                />
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
                            employmentType: String((editingPost as unknown as Record<string, unknown>).employmentType || ""),
                            workLocation: String((editingPost as unknown as Record<string, unknown>).workLocation || ""),
                            positions: String((editingPost as unknown as Record<string, unknown>).positions || "1"),
                            category: String((editingPost as unknown as Record<string, unknown>).category || ""),
                            externalApplyUrl: String((editingPost as unknown as Record<string, unknown>).externalApplyUrl || ""),
                            requiresResume: (editingPost as unknown as Record<string, unknown>).requiresResume !== false,
                            requiresCoverLetter: !!(editingPost as unknown as Record<string, unknown>).requiresCoverLetter,
                            requiresReferences: !!(editingPost as unknown as Record<string, unknown>).requiresReferences,
                            featured: !!(editingPost as unknown as Record<string, unknown>).featured,
                            willTrain: !!(editingPost as unknown as Record<string, unknown>).willTrain,
                            driversLicense: !!(editingPost as unknown as Record<string, unknown>).driversLicense,
                            status: editingPost.status || "draft",
                          }
                        : emptyForm
                    }
                    orgId={profile?.orgId || ""}
                    orgName={org?.name || ""}
                    orgShort={org?.shortName || ""}
                    onSave={() => {
                      setIsDuplicating(false);
                      handleFormSave();
                    }}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingPost(null);
                      setIsDuplicating(false);
                    }}
                    forceCreate={isDuplicating}
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
                            {/* Expired warning badge */}
                            {(post.status || "active") === "active" &&
                              post.closingDate &&
                              post.closingDate < new Date().toISOString().split("T")[0] && (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: "rgba(220,38,38,.12)", color: "#DC2626" }}
                              >
                                Expired
                              </span>
                            )}
                          </div>
                          <div
                            className="flex items-center gap-4 text-xs flex-wrap"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {post.location && <span>{displayLocation(post.location)}</span>}
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
                            Quick Edit
                          </button>
                          <Link
                            href={`/org/dashboard/jobs/${post.id}/edit`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold no-underline"
                            style={{
                              background: "rgba(30,64,175,.1)",
                              color: "var(--navy)",
                            }}
                          >
                            Full Edit
                          </Link>
                          <button
                            onClick={() => handleDuplicate(post)}
                            className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                            style={{
                              background: "rgba(139,92,246,.1)",
                              color: "#8B5CF6",
                            }}
                          >
                            Duplicate
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
    </AppShell>
    </OrgRoute>
  );
}
