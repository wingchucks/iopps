"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function CreateStoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState({
    title: "",
    personName: "",
    nation: "",
    pullQuote: "",
    fullStory: "",
    heroPhoto: "",
    videoUrl: "",
    tagsInput: "",
    status: "draft" as "draft" | "published",
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const tags = form.tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setForm((f) => ({ ...f, heroPhoto: result }));
    };
    reader.readAsDataURL(file);
  };

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          tags,
          tagsInput: undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Story created!");
      router.push("/admin/stories");
    } catch {
      toast.error("Failed to save story");
    } finally {
      setSaving(false);
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
          <button
            onClick={() => router.push("/admin/stories")}
            className="mb-2 flex items-center gap-1 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8l4-4" />
            </svg>
            Back to Stories
          </button>
          <h1 className="text-2xl font-bold">Create Success Story</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--card-border)" }}
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--input-focus)" }}
          >
            {saving ? "Saving…" : "Save Story"}
          </button>
        </div>
      </div>

      {showPreview ? (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          {photoPreview && (
            <img src={photoPreview} alt="" className="h-64 w-full object-cover" />
          )}
          <div className="space-y-4 p-6">
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                form.status === "published"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              )}
            >
              {form.status}
            </span>
            <h2 className="text-2xl font-bold">{form.title || "Untitled Story"}</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              {form.personName}{form.nation ? ` · ${form.nation}` : ""}
            </p>
            {form.pullQuote && (
              <blockquote
                className="border-l-4 pl-4 italic"
                style={{ borderColor: "var(--input-focus)", color: "var(--text-secondary)" }}
              >
                &ldquo;{form.pullQuote}&rdquo;
              </blockquote>
            )}
            <div className="whitespace-pre-wrap">{form.fullStory}</div>
            {form.videoUrl && (
              <div className="rounded-lg border p-4" style={{ borderColor: "var(--card-border)" }}>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Video: {form.videoUrl}</p>
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: "var(--input-bg)", color: "var(--text-secondary)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="space-y-5 rounded-xl border p-6"
          style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          {/* Hero Photo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="block w-full rounded-lg border px-3 py-2 text-sm"
              style={inputStyle}
            />
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="mt-2 h-40 rounded-lg object-cover" />
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Title / Headline</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="A compelling headline…"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
            />
          </div>

          {/* Person Name + Nation */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Person Name</label>
              <input
                type="text"
                value={form.personName}
                onChange={(e) => update("personName", e.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nation / Community</label>
              <input
                type="text"
                value={form.nation}
                onChange={(e) => update("nation", e.target.value)}
                placeholder="e.g. Cree Nation"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Pull Quote */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Pull Quote</label>
            <textarea
              value={form.pullQuote}
              onChange={(e) => update("pullQuote", e.target.value)}
              placeholder="A short, impactful quote…"
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
            />
          </div>

          {/* Full Story */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Story</label>
            <textarea
              value={form.fullStory}
              onChange={(e) => update("fullStory", e.target.value)}
              placeholder="The full narrative…"
              rows={8}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
            />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Video Embed URL <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
            <input
              type="text"
              value={form.videoUrl}
              onChange={(e) => update("videoUrl", e.target.value)}
              placeholder="https://youtube.com/embed/..."
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags <span style={{ color: "var(--text-muted)" }}>(comma-separated)</span></label>
            <input
              type="text"
              value={form.tagsInput}
              onChange={(e) => update("tagsInput", e.target.value)}
              placeholder="education, youth, resilience"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, "--tw-ring-color": "var(--input-focus)" } as React.CSSProperties}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: "var(--input-bg)", color: "var(--text-secondary)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status Toggle */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Status:</label>
            <button
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  status: f.status === "draft" ? "published" : "draft",
                }))
              }
              className={cn(
                "rounded-full px-4 py-1 text-sm font-medium transition-colors",
                form.status === "published"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              )}
            >
              {form.status === "published" ? "Published" : "Draft"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
