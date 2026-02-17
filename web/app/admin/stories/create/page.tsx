"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function CreateStoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState({
    personName: "", personNation: "", personPhoto: "", title: "",
    description: "", pullQuote: "", relatedOrg: "", videoEmbed: "",
    storyTags: "",
  });

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const save = async (status: "draft" | "active") => {
    setSaving(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          create: true,
          type: "story",
          status,
          title: form.title,
          description: form.description,
          personName: form.personName,
          personNation: form.personNation,
          personPhoto: form.personPhoto,
          pullQuote: form.pullQuote,
          relatedOrg: form.relatedOrg,
          videoEmbed: form.videoEmbed,
          storyTags: form.storyTags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      router.push("/admin/stories");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (preview) {
    return (
      <div>
        <button onClick={() => setPreview(false)} className="mb-4 text-sm text-[var(--accent)]">← Back to editor</button>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-8 max-w-3xl">
          {form.personPhoto && <img src={form.personPhoto} alt="" className="w-24 h-24 rounded-full object-cover mb-4" />}
          <h1 className="text-3xl font-bold mb-2">{form.title || "Untitled"}</h1>
          <div className="text-[var(--text-secondary)] mb-4">{form.personName} · {form.personNation}</div>
          {form.pullQuote && (
            <blockquote className="border-l-4 border-[var(--accent)] pl-4 italic text-lg text-[var(--text-secondary)] my-6">
              &ldquo;{form.pullQuote}&rdquo;
            </blockquote>
          )}
          <div className="prose max-w-none whitespace-pre-wrap">{form.description}</div>
          {form.videoEmbed && <div className="mt-6 aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-[var(--text-muted)]">Video: {form.videoEmbed}</div>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create Success Story</h1>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6 max-w-3xl space-y-4">
        {([
          ["personName", "Person Name"],
          ["personNation", "Nation / Community"],
          ["personPhoto", "Photo URL"],
          ["title", "Headline"],
          ["pullQuote", "Pull Quote"],
          ["relatedOrg", "Related Organization"],
          ["videoEmbed", "Video Embed URL"],
          ["storyTags", "Tags (comma separated)"],
        ] as [string, string][]).map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input type="text" value={form[key as keyof typeof form]} onChange={(e) => update(key, e.target.value)}
              className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]" />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium mb-1">Full Story</label>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)}
            rows={12} className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => setPreview(true)}
            className="px-4 py-2 border border-[var(--input-border)] rounded-lg text-sm font-medium">Preview</button>
          <button onClick={() => save("draft")} disabled={saving}
            className="px-4 py-2 border border-[var(--input-border)] rounded-lg text-sm font-medium">Save Draft</button>
          <button onClick={() => save("active")} disabled={saving}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)]">Publish</button>
        </div>
      </div>
    </div>
  );
}
