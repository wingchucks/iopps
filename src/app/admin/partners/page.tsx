"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  tier: "Premium" | "Standard";
  visible: boolean;
  spotlight: boolean;
  order: number;
}

export default function PartnersPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: "",
    logoUrl: "",
    websiteUrl: "",
    tier: "Standard" as "Premium" | "Standard",
  });
  const [saving, setSaving] = useState(false);

  const fetchPartners = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/partners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPartners(data.partners || []);
    } catch {
      toast.error("Failed to load partners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPartners();
  }, [user]);

  const handleAdd = async () => {
    if (!modalForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(modalForm),
      });
      if (!res.ok) throw new Error();
      toast.success("Partner added!");
      setShowModal(false);
      setModalForm({ name: "", logoUrl: "", websiteUrl: "", tier: "Standard" });
      fetchPartners();
    } catch {
      toast.error("Failed to add partner");
    } finally {
      setSaving(false);
    }
  };

  const toggleField = async (id: string, field: "visible" | "spotlight", current: boolean) => {
    try {
      const token = await user?.getIdToken();
      await fetch(`/api/admin/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: !current }),
      });
      setPartners((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: !current } : p))
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  const movePartner = async (index: number, direction: "up" | "down") => {
    const newPartners = [...partners];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newPartners.length) return;

    [newPartners[index], newPartners[swapIndex]] = [newPartners[swapIndex], newPartners[index]];

    const reordered = newPartners.map((p, i) => ({ ...p, order: i }));
    setPartners(reordered);

    try {
      const token = await user?.getIdToken();
      await fetch("/api/admin/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          partners: reordered.map((p) => ({ id: p.id, order: p.order })),
        }),
      });
    } catch {
      toast.error("Failed to reorder");
      fetchPartners();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this partner?")) return;
    try {
      const token = await user?.getIdToken();
      await fetch(`/api/admin/partners/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Partner removed");
      setPartners((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Failed to delete");
    }
  };

  const inputStyle = {
    backgroundColor: "var(--input-bg)",
    borderColor: "var(--input-border)",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partner Showcase</h1>
          <p style={{ color: "var(--text-muted)" }}>
            Manage partners displayed across 7 homepage touchpoints: hero banner logos, partner ticker,
            spotlight cards, footer grid, testimonial quotes, impact stats co-branding, and the dedicated partners page.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 rounded-lg px-4 py-2 font-medium text-white"
          style={{ backgroundColor: "var(--input-focus)" }}
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add Partner
          </span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : partners.length === 0 ? (
        <div
          className="rounded-xl border py-12 text-center"
          style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>No partners yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {partners.map((partner, index) => (
            <div
              key={partner.id}
              className="flex items-center gap-4 rounded-xl border p-4"
              style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
            >
              {/* Reorder */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => movePartner(index, "up")}
                  disabled={index === 0}
                  className="rounded p-1 text-xs disabled:opacity-20 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l4-4 4 4" />
                  </svg>
                </button>
                <button
                  onClick={() => movePartner(index, "down")}
                  disabled={index === partners.length - 1}
                  className="rounded p-1 text-xs disabled:opacity-20 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 5l4 4 4-4" />
                  </svg>
                </button>
              </div>

              {/* Logo */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
                {partner.logoUrl ? (
                  <img src={partner.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--text-muted)" }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{partner.name}</h3>
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      partner.tier === "Premium"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                    )}
                  >
                    {partner.tier}
                  </span>
                  {partner.websiteUrl && (
                    <a
                      href={partner.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:underline"
                    >
                      {partner.websiteUrl.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleField(partner.id, "visible", partner.visible)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    partner.visible
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                  )}
                >
                  {partner.visible ? "Visible" : "Hidden"}
                </button>
                <button
                  onClick={() => toggleField(partner.id, "spotlight", partner.spotlight)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    partner.spotlight
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                  )}
                >
                  {partner.spotlight ? "★ Spotlight" : "Spotlight"}
                </button>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(partner.id)}
                className="rounded-md p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Partner Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md space-y-4 rounded-xl border p-6"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            <h2 className="text-lg font-bold">Add Partner</h2>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={modalForm.name}
                  onChange={(e) => setModalForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Partner name"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Logo URL</label>
                <input
                  type="text"
                  value={modalForm.logoUrl}
                  onChange={(e) => setModalForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Website URL</label>
                <input
                  type="text"
                  value={modalForm.websiteUrl}
                  onChange={(e) => setModalForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tier</label>
                <select
                  value={modalForm.tier}
                  onChange={(e) => setModalForm((f) => ({ ...f, tier: e.target.value as "Premium" | "Standard" }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
                >
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--card-border)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--input-focus)" }}
              >
                {saving ? "Adding…" : "Add Partner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
