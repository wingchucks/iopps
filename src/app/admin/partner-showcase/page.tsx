"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminRoute from "@/components/AdminRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import PageSkeleton from "@/components/PageSkeleton";
import { useToast } from "@/lib/toast-context";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  description: string;
  tier: "gold" | "silver" | "bronze";
  displayOrder: number;
  visible: boolean;
  createdAt: unknown;
}

const emptyForm = {
  name: "",
  logoUrl: "",
  websiteUrl: "",
  description: "",
  tier: "silver" as Partner["tier"],
  displayOrder: 0,
};

const tierColors: Record<string, string> = {
  gold: "#D97706",
  silver: "#6B7280",
  bronze: "#B45309",
};

export default function AdminPartnerShowcasePage() {
  return (
    <AdminRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <PartnerManager />
      </div>
    </AppShell>
    </AdminRoute>
  );
}

function PartnerManager() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const q = query(collection(db, "partner_showcase"), orderBy("displayOrder", "asc"));
      const snap = await getDocs(q);
      setPartners(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Partner)
      );
    } catch (err) {
      console.error("Failed to load partners:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "partner_showcase", editingId), { ...form });
        showToast("Partner updated");
      } else {
        await addDoc(collection(db, "partner_showcase"), {
          ...form,
          visible: true,
          createdAt: serverTimestamp(),
        });
        showToast("Partner added");
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      console.error(err);
      showToast("Failed to save partner", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: Partner) => {
    setForm({
      name: p.name,
      logoUrl: p.logoUrl,
      websiteUrl: p.websiteUrl,
      description: p.description,
      tier: p.tier,
      displayOrder: p.displayOrder,
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const toggleVisible = async (p: Partner) => {
    try {
      await updateDoc(doc(db, "partner_showcase", p.id), { visible: !p.visible });
      showToast(p.visible ? "Partner hidden" : "Partner visible");
      await load();
    } catch {
      showToast("Failed to update visibility", "error");
    }
  };

  const moveOrder = async (p: Partner, direction: "up" | "down") => {
    const newOrder = direction === "up" ? p.displayOrder - 1 : p.displayOrder + 1;
    if (newOrder < 0) return;
    try {
      await updateDoc(doc(db, "partner_showcase", p.id), { displayOrder: newOrder });
      // Swap with the adjacent partner if one exists
      const adjacent = partners.find((o) => o.id !== p.id && o.displayOrder === newOrder);
      if (adjacent) {
        await updateDoc(doc(db, "partner_showcase", adjacent.id), {
          displayOrder: p.displayOrder,
        });
      }
      await load();
    } catch {
      showToast("Failed to reorder", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this partner?")) return;
    try {
      await deleteDoc(doc(db, "partner_showcase", id));
      showToast("Partner deleted");
      await load();
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  if (loading) return <PageSkeleton variant="grid" />;

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <Link href="/admin" className="text-sm text-text-sec hover:underline mb-4 block">
        &larr; Back to Admin
      </Link>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-extrabold text-text">Partner Showcase</h2>
        <Button
          primary
          small
          onClick={() => {
            setForm({ ...emptyForm, displayOrder: partners.length });
            setEditingId(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Partner"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6" style={{ padding: 20 }}>
          <h3 className="text-base font-bold text-text mb-4">
            {editingId ? "Edit Partner" : "New Partner"}
          </h3>
          <div className="flex flex-col gap-3">
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Partner Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Logo URL"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Website URL"
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
            />
            <textarea
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none resize-none"
              rows={2}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value as Partner["tier"] })}
              >
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
              </select>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
                placeholder="Display Order"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              />
            </div>
            <Button primary small onClick={handleSave} className={saving ? "opacity-60" : ""}>
              {saving ? "Saving..." : editingId ? "Update" : "Add Partner"}
            </Button>
          </div>
        </Card>
      )}

      {/* List */}
      {partners.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-10">No partners yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {partners.map((p, idx) => (
            <Card key={p.id} style={{ padding: 16 }}>
              <div className="flex gap-4 items-center">
                {/* Drag handle + order arrows */}
                <div className="flex flex-col items-center gap-0.5 shrink-0 text-text-muted">
                  <button
                    onClick={() => moveOrder(p, "up")}
                    disabled={idx === 0}
                    className="text-xs cursor-pointer hover:text-text disabled:opacity-30 bg-transparent border-none"
                  >
                    &#9650;
                  </button>
                  <span className="text-[10px]" title="Drag handle">&#9776;</span>
                  <button
                    onClick={() => moveOrder(p, "down")}
                    disabled={idx === partners.length - 1}
                    className="text-xs cursor-pointer hover:text-text disabled:opacity-30 bg-transparent border-none"
                  >
                    &#9660;
                  </button>
                </div>

                {/* Logo placeholder */}
                <div
                  className="w-12 h-12 rounded-lg bg-bg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-text-muted text-lg">P</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-text text-sm truncate">{p.name}</p>
                    <Badge
                      text={p.tier}
                      color={tierColors[p.tier]}
                      small
                    />
                  </div>
                  <p className="text-xs text-text-muted truncate">{p.description || p.websiteUrl}</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleVisible(p)}
                    className={`text-xs px-2 py-1 rounded-lg border cursor-pointer ${
                      p.visible
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-bg border-border text-text-muted"
                    }`}
                  >
                    {p.visible ? "Visible" : "Hidden"}
                  </button>
                  <button
                    onClick={() => handleEdit(p)}
                    className="text-xs px-2 py-1 rounded-lg bg-bg border border-border text-text-sec hover:bg-card cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs px-2 py-1 rounded-lg text-red-500 bg-bg border border-border hover:bg-red-50 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
