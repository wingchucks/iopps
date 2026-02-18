"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminRoute from "@/components/AdminRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  getOrganizations,
  setOrganization,
  deleteOrganization,
  type Organization,
} from "@/lib/firestore/organizations";

const emptyOrg: Omit<Organization, "id"> = {
  name: "",
  shortName: "",
  type: "employer",
  tier: "standard",
  location: "",
  website: "",
  description: "",
  openJobs: 0,
  employees: "",
  since: "",
  verified: false,
  tags: [],
};

export default function AdminOrganizationsPage() {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <OrgManager />
      </div>
    </AdminRoute>
  );
}

/** Safely convert a location field to a display string. Firestore may store it as an object {city, province} or a plain string. */
function displayLocation(loc: unknown): string {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  if (typeof loc === "object" && loc !== null) {
    const obj = loc as Record<string, unknown>;
    const parts = [obj.city, obj.province].filter(Boolean).map(String);
    return parts.join(", ");
  }
  return String(loc);
}

/** Safely convert a tags field to a string array. Firestore may return undefined or a non-array value. */
function ensureTagsArray(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String);
  return [];
}

function OrgManager() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // org id or "new"
  const [form, setForm] = useState<Omit<Organization, "id">>(emptyOrg);
  const [formId, setFormId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getOrganizations();
      setOrgs(data);
    } catch (err) {
      console.error("Failed to load orgs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (org: Organization) => {
    setEditing(org.id);
    setFormId(org.id);
    const { id, ...rest } = org;
    // Normalize location to string for the form (Firestore may store as object)
    setForm({ ...rest, location: displayLocation(rest.location) as string, tags: ensureTagsArray(rest.tags) });
  };

  const startNew = () => {
    setEditing("new");
    setFormId("");
    setForm({ ...emptyOrg });
  };

  const cancel = () => {
    setEditing(null);
    setForm({ ...emptyOrg });
    setFormId("");
  };

  const handleSave = async () => {
    const id = editing === "new" ? formId.trim() : editing!;
    if (!id) return alert("ID is required");
    if (!form.name.trim()) return alert("Name is required");

    setSaving(true);
    try {
      await setOrganization(id, form);
      await load();
      cancel();
    } catch (err) {
      console.error("Failed to save org:", err);
      alert("Failed to save. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete organization "${id}"? This cannot be undone.`)) return;
    try {
      await deleteOrganization(id);
      await load();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete. Check console.");
    }
  };

  const updateField = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
          Organizations
        </h2>
        {!editing && (
          <Button
            primary
            small
            onClick={startNew}
            style={{ background: "var(--teal)" }}
          >
            + New Organization
          </Button>
        )}
      </div>

      {editing && (
        <Card className="mb-6">
          <div style={{ padding: 20 }}>
            <h3 className="text-lg font-bold text-text mb-4">
              {editing === "new" ? "New Organization" : `Edit: ${editing}`}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {editing === "new" && (
                <label className="block">
                  <span className="text-xs font-semibold text-text-sec mb-1 block">
                    Document ID (slug)
                  </span>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                    placeholder="e.g. siga"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Name
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                  placeholder="Saskatchewan Indian Gaming Authority"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Short Name
                </span>
                <input
                  type="text"
                  value={form.shortName}
                  onChange={(e) => updateField("shortName", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                  placeholder="SIGA"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Type
                </span>
                <select
                  value={form.type}
                  onChange={(e) => updateField("type", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                >
                  <option value="employer">Employer</option>
                  <option value="school">School</option>
                  <option value="business">Business</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Tier
                </span>
                <select
                  value={form.tier}
                  onChange={(e) => updateField("tier", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                >
                  <option value="premium">Premium</option>
                  <option value="school">School</option>
                  <option value="standard">Standard</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Location
                </span>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                  placeholder="Saskatoon, SK"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Website
                </span>
                <input
                  type="text"
                  value={form.website || ""}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                  placeholder="https://siga.ca"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Employees
                </span>
                <input
                  type="text"
                  value={form.employees || ""}
                  onChange={(e) => updateField("employees", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                  placeholder="500-1000"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Since
                </span>
                <input
                  type="text"
                  value={form.since}
                  onChange={(e) => updateField("since", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                  placeholder="1995"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Open Jobs
                </span>
                <input
                  type="number"
                  value={form.openJobs}
                  onChange={(e) => updateField("openJobs", Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-sec mb-1 block">
                  Tags (comma-separated)
                </span>
                <input
                  type="text"
                  value={ensureTagsArray(form.tags).join(", ")}
                  onChange={(e) =>
                    updateField(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                  placeholder="Gaming, Hospitality, First Nations"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.verified}
                  onChange={(e) => updateField("verified", e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-text-sec">Verified</span>
              </label>
            </div>

            <label className="block mb-4">
              <span className="text-xs font-semibold text-text-sec mb-1 block">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal resize-none"
                placeholder="A brief description of the organization..."
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
                {saving ? "Saving..." : "Save Organization"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-border/40 shimmer"
            />
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-10">
          No organizations yet.
        </p>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <Card key={org.id}>
              <div className="flex items-center gap-4" style={{ padding: 16 }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-[15px] text-text m-0">
                      {org.name}
                    </p>
                    {org.verified && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style={{
                          background: "rgba(13,148,136,.1)",
                          color: "var(--teal)",
                        }}
                      >
                        VERIFIED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted m-0">
                    {org.type} &middot; {org.tier} &middot; {displayLocation(org.location)}
                    {org.openJobs > 0 && ` \u00B7 ${org.openJobs} open jobs`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button small onClick={() => startEdit(org)}>
                    Edit
                  </Button>
                  <Button
                    small
                    onClick={() => handleDelete(org.id)}
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
