"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type DataCategory = "nations" | "skills" | "industries" | "eventCategories" | "scholarshipCategories" | "programCategories" | "businessCategories";

const CATEGORIES: { key: DataCategory; label: string }[] = [
  { key: "nations", label: "Nations / Communities" },
  { key: "skills", label: "Skills" },
  { key: "industries", label: "Industries" },
  { key: "eventCategories", label: "Event Categories" },
  { key: "scholarshipCategories", label: "Scholarship Categories" },
  { key: "programCategories", label: "Program Categories" },
  { key: "businessCategories", label: "Business Categories" },
];

export default function AdminDataPage() {
  const [active, setActive] = useState<DataCategory>("nations");
  const [items, setItems] = useState<Record<DataCategory, string[]>>({
    nations: [], skills: [], industries: [], eventCategories: [],
    scholarshipCategories: [], programCategories: [], businessCategories: [],
  });
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/admin/counts?include=data", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.dropdownData) setItems(data.dropdownData);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  const saveItems = async (category: DataCategory, values: string[]) => {
    const token = await auth?.currentUser?.getIdToken();
    await fetch("/api/admin/counts", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ dropdownData: { [category]: values } }),
    });
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const updated = [...items[active], newItem.trim()].sort();
    setItems({ ...items, [active]: updated });
    saveItems(active, updated);
    setNewItem("");
  };

  const removeItem = (index: number) => {
    const updated = items[active].filter((_, i) => i !== index);
    setItems({ ...items, [active]: updated });
    saveItems(active, updated);
  };

  if (loading) return <div className="animate-pulse">Loading data...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dropdown Data Management</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setActive(c.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${active === c.key ? "bg-[var(--accent)] text-white" : "bg-[var(--card-bg)] border border-[var(--card-border)]"}`}>
            {c.label} ({items[c.key].length})
          </button>
        ))}
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex gap-2 mb-4">
          <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder={`Add new ${CATEGORIES.find((c) => c.key === active)?.label.toLowerCase()}...`}
            className="flex-1 px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]" />
          <button onClick={addItem} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium">Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items[active].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--surface-raised)] border border-[var(--card-border)] rounded-full text-sm">
              {item}
              <button onClick={() => removeItem(i)} className="text-[var(--text-muted)] hover:text-[var(--danger)]">×</button>
            </span>
          ))}
          {items[active].length === 0 && <span className="text-[var(--text-muted)]">No items yet</span>}
        </div>
      </div>
    </div>
  );
}
