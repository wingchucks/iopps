"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataItem {
  id: string;
  name: string;
  order: number;
}

const CATEGORIES = [
  { key: "nations", label: "Nations" },
  { key: "treaties", label: "Treaties" },
  { key: "jobCategories", label: "Job Categories" },
  { key: "eventTypes", label: "Event Types" },
  { key: "businessCategories", label: "Business Categories" },
  { key: "programCategories", label: "Program Categories" },
  { key: "skills", label: "Skills" },
  { key: "indigenousLanguages", label: "Indigenous Languages" },
];

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
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
// Category Editor
// ---------------------------------------------------------------------------

function CategoryEditor({ categoryKey, label, user }: { categoryKey: string; label: string; user: { getIdToken: () => Promise<string> } }) {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/data/${categoryKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      toast.error(`Failed to load ${label}`);
    } finally {
      setLoading(false);
    }
  }, [user, categoryKey, label]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/data/${categoryKey}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), order: items.length }),
      });
      if (!res.ok) throw new Error("Failed");
      setNewName("");
      toast.success("Item added");
      fetchItems();
    } catch {
      toast.error("Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/data/${categoryKey}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editName.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditId(null);
      toast.success("Item updated");
      fetchItems();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/data/${categoryKey}?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Item deleted");
      fetchItems();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;

    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    setItems(newItems);

    try {
      const token = await user.getIdToken();
      await Promise.all([
        fetch(`/api/admin/data/${categoryKey}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id: newItems[index].id, order: index }),
        }),
        fetch(`/api/admin/data/${categoryKey}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id: newItems[swapIndex].id, order: swapIndex }),
        }),
      ]);
    } catch {
      toast.error("Failed to reorder");
      fetchItems();
    }
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      {/* Search & Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="w-full rounded-lg border border-[var(--card-border)] bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New item..."
          className="w-48 rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newName.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--text-muted)]">
          {items.length === 0 ? "No items yet" : "No matching items"}
        </p>
      ) : (
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {filtered.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2">
              {/* Reorder */}
              <div className="flex flex-col">
                <button onClick={() => handleReorder(idx, "up")} disabled={idx === 0} className="text-[var(--text-muted)] hover:text-foreground disabled:opacity-20">
                  <ChevronUpIcon className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleReorder(idx, "down")} disabled={idx === filtered.length - 1} className="text-[var(--text-muted)] hover:text-foreground disabled:opacity-20">
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Name */}
              {editId === item.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEdit(item.id)}
                  onBlur={() => setEditId(null)}
                  autoFocus
                  className="flex-1 rounded border border-accent bg-transparent px-2 py-1 text-sm outline-none"
                />
              ) : (
                <span
                  className="flex-1 cursor-pointer text-sm"
                  onClick={() => { setEditId(item.id); setEditName(item.name); }}
                >
                  {item.name}
                </span>
              )}

              {/* Delete */}
              <button onClick={() => handleDelete(item.id)} className="text-[var(--text-muted)] transition-colors hover:text-red-400">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DataManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(CATEGORIES[0].key);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Fetch counts for all categories
  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const results: Record<string, number> = {};
      await Promise.all(
        CATEGORIES.map(async (cat) => {
          try {
            const res = await fetch(`/api/admin/data/${cat.key}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              results[cat.key] = (data.items || []).length;
            }
          } catch { /* ignore */ }
        })
      );
      setCounts(results);
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Management</h1>
        <p className="text-sm text-[var(--text-muted)]">Manage platform categories, nations, skills, and reference data</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === cat.key ? "bg-accent text-white" : "text-[var(--text-muted)] hover:text-foreground"
            )}
          >
            {cat.label}
            {counts[cat.key] !== undefined && (
              <span className="ml-1.5 text-xs opacity-70">({counts[cat.key]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        {CATEGORIES.map((cat) =>
          activeTab === cat.key ? (
            <CategoryEditor key={cat.key} categoryKey={cat.key} label={cat.label} user={user} />
          ) : null
        )}
      </div>
    </div>
  );
}
