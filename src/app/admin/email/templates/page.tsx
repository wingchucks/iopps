"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  htmlContent: string;
  lastUsedAt?: string;
  createdAt: string;
}

const TEMPLATE_TYPES = ["Digest", "Broadcast", "Welcome", "Event"];

const typeBadgeStyles: Record<string, string> = {
  Digest: "bg-blue-500/10 text-blue-500",
  Broadcast: "bg-purple-500/10 text-purple-500",
  Welcome: "bg-emerald-500/10 text-emerald-500",
  Event: "bg-amber-500/10 text-amber-500",
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmailTemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Create/Edit form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("Broadcast");
  const [formDesc, setFormDesc] = useState("");
  const [formHtml, setFormHtml] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/email/templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const resetForm = () => {
    setFormName("");
    setFormType("Broadcast");
    setFormDesc("");
    setFormHtml("");
    setShowCreate(false);
    setEditId(null);
  };

  const startEdit = (t: Template) => {
    setFormName(t.name);
    setFormType(t.type);
    setFormDesc(t.description);
    setFormHtml(t.htmlContent);
    setEditId(t.id);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const method = editId ? "PUT" : "POST";
      const payload = {
        ...(editId ? { id: editId } : {}),
        name: formName,
        type: formType,
        description: formDesc,
        htmlContent: formHtml,
      };
      const res = await fetch("/api/admin/email/templates", {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(editId ? "Template updated" : "Template created");
      resetForm();
      fetchTemplates();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (t: Template) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/email/templates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${t.name} (Copy)`, type: t.type, description: t.description, htmlContent: t.htmlContent }),
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      toast.success("Template duplicated");
      fetchTemplates();
    } catch {
      toast.error("Failed to duplicate template");
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm("Delete this template?")) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/email/templates", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id, deleted: true }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Template deleted");
      fetchTemplates();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-sm text-[var(--text-muted)]">Reusable email templates for campaigns</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <PlusIcon />
          Create Template
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreate && (
        <div className="rounded-xl border border-accent/30 bg-[var(--card-bg)] p-5 space-y-4">
          <h2 className="text-lg font-semibold">{editId ? "Edit Template" : "New Template"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="Template name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <input
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Short description"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">HTML Content</label>
            <textarea
              value={formHtml}
              onChange={(e) => setFormHtml(e.target.value)}
              rows={8}
              className="w-full resize-y rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-accent"
              placeholder="<h1>Your email HTML here...</h1>"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
            <button onClick={resetForm} className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-[var(--text-muted)]">
          <p>No templates yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">{t.description || "No description"}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", typeBadgeStyles[t.type] || "bg-gray-500/10 text-gray-400")}>
                  {t.type}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {t.lastUsedAt ? `Last used ${formatDate(t.lastUsedAt)}` : "Never used"}
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => startEdit(t)} className="rounded-lg border border-[var(--card-border)] px-3 py-1 text-xs font-medium hover:bg-muted">
                  Edit
                </button>
                <button onClick={() => handleDuplicate(t)} className="rounded-lg border border-[var(--card-border)] px-3 py-1 text-xs font-medium hover:bg-muted">
                  Duplicate
                </button>
                <button onClick={() => handleDelete(t.id)} className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  className="ml-auto rounded-lg border border-[var(--card-border)] px-3 py-1 text-xs font-medium hover:bg-muted"
                >
                  {expandedId === t.id ? "Hide" : "Preview"}
                </button>
              </div>
              {expandedId === t.id && t.htmlContent && (
                <div className="mt-3 max-h-60 overflow-auto rounded-lg border border-[var(--card-border)] bg-white p-3 text-sm text-gray-800">
                  <div dangerouslySetInnerHTML={{ __html: t.htmlContent }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
