"use client";

import { useState, useEffect } from "react";
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
  getScholarshipsByOrg,
  createScholarship,
  updateScholarship,
  deleteScholarship,
  type Scholarship,
} from "@/lib/firestore/scholarships";
import OrgDashboardNav from "@/components/OrgDashboardNav";
import Avatar from "@/components/Avatar";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type ScholarshipStatus = "draft" | "active" | "closed";

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  amount: "",
  deadline: "",
  eligibility: "",
  requirements: [""],
  applicationUrl: "",
  location: "",
  status: "draft" as ScholarshipStatus,
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

function StatusBadge({ status }: { status?: ScholarshipStatus }) {
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

function ScholarshipForm({
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

  const handleSubmit = async (publishStatus: ScholarshipStatus) => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const slug = form.slug || slugify(form.title);
      const data = {
        title: form.title,
        slug,
        description: form.description,
        amount: form.amount,
        deadline: form.deadline,
        eligibility: form.eligibility,
        requirements: form.requirements.filter((r) => r.trim()),
        applicationUrl: form.applicationUrl,
        location: form.location,
        status: publishStatus,
        orgId,
        orgName,
        orgShort,
      };
      if (isEdit) {
        await updateScholarship(slug, data);
      } else {
        await createScholarship(data);
      }
      onSave();
    } catch (err) {
      console.error("Failed to save scholarship:", err);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof FormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputStyle = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
        {isEdit ? "Edit Scholarship" : "Create Scholarship"}
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
            placeholder="e.g. Indigenous Youth Leadership Scholarship"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
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
            style={inputStyle}
            disabled={isEdit}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe the scholarship, its purpose, and who it supports..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-sm resize-y"
            style={inputStyle}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Amount
            </label>
            <input
              type="text"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder='e.g. "$5,000" or "Full tuition"'
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Deadline
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => set("deadline", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Eligibility
          </label>
          <textarea
            value={form.eligibility}
            onChange={(e) => set("eligibility", e.target.value)}
            placeholder="Who is eligible? e.g. Indigenous students enrolled in post-secondary..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm resize-y"
            style={inputStyle}
          />
        </div>
        <ListEditor
          label="Requirements"
          items={form.requirements}
          onChange={(items) => set("requirements", items)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Application URL
            </label>
            <input
              type="url"
              value={form.applicationUrl}
              onChange={(e) => set("applicationUrl", e.target.value)}
              placeholder="https://yourorg.com/apply"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Canada-wide or Saskatchewan"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>
        </div>
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

export default function OrgDashboardScholarshipsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const memberProfile = await getMemberProfile(user.uid);
        if (!memberProfile?.orgId) return;
        setProfile(memberProfile);

        const [organization, orgScholarships] = await Promise.all([
          getOrganization(memberProfile.orgId),
          getScholarshipsByOrg(memberProfile.orgId),
        ]);
        setOrg(organization);
        setScholarships(orgScholarships);
      } catch (err) {
        console.error("Failed to load scholarships:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleDelete = async (scholarshipId: string) => {
    if (!confirm("Are you sure you want to delete this scholarship?")) return;
    await deleteScholarship(scholarshipId);
    setScholarships((prev) => prev.filter((s) => s.id !== scholarshipId));
  };

  const handleEdit = (scholarship: Scholarship) => {
    setEditingScholarship(scholarship);
    setIsDuplicating(false);
    setShowForm(true);
  };

  const handleDuplicate = (scholarship: Scholarship) => {
    const cloned = {
      ...scholarship,
      id: "",
      title: `Copy of ${scholarship.title}`,
      slug: slugify(`copy-of-${scholarship.title}-${Date.now()}`),
      status: "draft",
    };
    setEditingScholarship(cloned as Scholarship);
    setIsDuplicating(true);
    setShowForm(true);
  };

  const handleToggleStatus = async (scholarship: Scholarship) => {
    const newStatus: ScholarshipStatus =
      (scholarship.status || "active") === "active" ? "closed" : "active";
    await updateScholarship(scholarship.id, { status: newStatus });
    setScholarships((prev) =>
      prev.map((s) => (s.id === scholarship.id ? { ...s, status: newStatus } : s))
    );
  };

  const handleFormSave = async () => {
    setShowForm(false);
    setEditingScholarship(null);
    setIsDuplicating(false);
    if (!profile?.orgId) return;
    setLoading(true);
    const orgScholarships = await getScholarshipsByOrg(profile.orgId);
    setScholarships(orgScholarships);
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

  const stats = {
    total: scholarships.length,
    active: scholarships.filter((s) => (s.status || "active") === "active").length,
    draft: scholarships.filter((s) => s.status === "draft").length,
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
                    <Avatar name={org?.shortName || org?.name || ""} size={48} src={org?.logoUrl || org?.logo} />
                    <div>
                      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                        Scholarships
                      </h1>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Create and manage scholarship listings
                      </p>
                    </div>
                  </div>
                  <OrgDashboardNav orgSlug={org?.slug} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: "Total Scholarships", value: stats.total },
                    { label: "Active", value: stats.active },
                    { label: "Drafts", value: stats.draft },
                  ].map(({ label, value }) => (
                    <Card key={label} className="p-5">
                      <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                        {label}
                      </p>
                      <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>
                        {value}
                      </p>
                    </Card>
                  ))}
                </div>

                {/* Create button */}
                {!showForm && (
                  <div className="mb-6">
                    <button
                      onClick={() => {
                        setEditingScholarship(null);
                        setIsDuplicating(false);
                        setShowForm(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer transition-all hover:opacity-80"
                      style={{ background: "var(--teal)", color: "#fff" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create Scholarship
                    </button>
                  </div>
                )}

                {/* Form */}
                {showForm && (
                  <div className="mb-8">
                    <ScholarshipForm
                      initial={
                        editingScholarship
                          ? {
                              title: editingScholarship.title,
                              slug: editingScholarship.slug || editingScholarship.id,
                              description: editingScholarship.description || "",
                              amount: editingScholarship.amount || "",
                              deadline: editingScholarship.deadline || "",
                              eligibility: editingScholarship.eligibility || "",
                              requirements: editingScholarship.requirements?.length
                                ? editingScholarship.requirements
                                : [""],
                              applicationUrl: editingScholarship.applicationUrl || "",
                              location: editingScholarship.location || "",
                              status: (editingScholarship.status as ScholarshipStatus) || "draft",
                            }
                          : emptyForm
                      }
                      orgId={profile?.orgId || ""}
                      orgName={org?.name || ""}
                      orgShort={org?.shortName || ""}
                      onSave={handleFormSave}
                      onCancel={() => {
                        setShowForm(false);
                        setEditingScholarship(null);
                        setIsDuplicating(false);
                      }}
                      forceCreate={isDuplicating}
                    />
                  </div>
                )}

                {/* Scholarships list */}
                <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
                  Your Scholarships
                </h2>
                {scholarships.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      No scholarships yet. Click &quot;Create Scholarship&quot; to add your first listing.
                    </p>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {scholarships.map((scholarship) => (
                      <Card key={scholarship.id} className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                              <h3 className="text-base font-bold truncate" style={{ color: "var(--text)" }}>
                                {scholarship.title}
                              </h3>
                              <StatusBadge status={scholarship.status as ScholarshipStatus} />
                              {scholarship.amount && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{ background: "rgba(16,185,129,.12)", color: "#10B981" }}
                                >
                                  {scholarship.amount}
                                </span>
                              )}
                            </div>
                            <div
                              className="flex items-center gap-4 text-xs flex-wrap"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {scholarship.deadline && <span>Deadline: {scholarship.deadline}</span>}
                              {scholarship.location && <span>{scholarship.location}</span>}
                              <span>Created: {formatDate(scholarship.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleStatus(scholarship)}
                              className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                              style={{
                                background:
                                  (scholarship.status || "active") === "active"
                                    ? "rgba(107,114,128,.1)"
                                    : "rgba(16,185,129,.1)",
                                color:
                                  (scholarship.status || "active") === "active"
                                    ? "#6B7280"
                                    : "#10B981",
                              }}
                            >
                              {(scholarship.status || "active") === "active" ? "Close" : "Reopen"}
                            </button>
                            <button
                              onClick={() => handleEdit(scholarship)}
                              className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                              style={{ background: "rgba(13,148,136,.1)", color: "var(--teal)" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDuplicate(scholarship)}
                              className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                              style={{ background: "rgba(139,92,246,.1)", color: "#8B5CF6" }}
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleDelete(scholarship.id)}
                              className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                              style={{ background: "rgba(220,38,38,.1)", color: "#DC2626" }}
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
