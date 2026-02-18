"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminRoute from "@/components/AdminRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import PageSkeleton from "@/components/PageSkeleton";
import { useToast } from "@/lib/toast-context";
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  type Post,
} from "@/lib/firestore/posts";

type StoryCategory = "Success Story" | "Community Spotlight" | "Interview" | "Feature";

const storyCategories: StoryCategory[] = [
  "Success Story",
  "Community Spotlight",
  "Interview",
  "Feature",
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function categoryToType(cat: StoryCategory): "story" | "spotlight" {
  return cat === "Community Spotlight" || cat === "Interview"
    ? "spotlight"
    : "story";
}

const emptyForm = {
  title: "",
  slug: "",
  content: "",
  author: "",
  featuredImage: "",
  category: "Success Story" as StoryCategory,
  excerpt: "",
  status: "draft" as "draft" | "published",
};

export default function AdminStoriesPage() {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <StoriesManager />
      </div>
    </AdminRoute>
  );
}

function StoriesManager() {
  const [stories, setStories] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const [storyPosts, spotlightPosts] = await Promise.all([
        getPosts({ type: "story" }),
        getPosts({ type: "spotlight" }),
      ]);
      setStories([...storyPosts, ...spotlightPosts]);
    } catch (err) {
      console.error("Failed to load stories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const postType = categoryToType(form.category);
      const slug = form.slug || slugify(form.title);
      const postId = `${postType}-${slug}`;

      const data = {
        title: form.title,
        slug,
        description: form.content,
        author: form.author,
        featuredImage: form.featuredImage,
        community: form.category,
        excerpt: form.excerpt,
        status: form.status === "published" ? ("active" as const) : ("draft" as const),
        type: postType as "story" | "spotlight",
      };

      if (editingId) {
        await updatePost(editingId, data);
        showToast("Story updated");
      } else {
        await createPost(data);
        showToast("Story created");
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      console.error(err);
      showToast("Failed to save story", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: Post) => {
    const cat = storyCategories.find(
      (c) => c.toLowerCase() === s.community?.toLowerCase()
    ) || (s.type === "spotlight" ? "Community Spotlight" : "Success Story");

    setForm({
      title: s.title,
      slug: s.slug || "",
      content: s.description || "",
      author: s.author || "",
      featuredImage: s.featuredImage || "",
      category: cat,
      excerpt: s.excerpt || "",
      status: s.status === "active" ? "published" : "draft",
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this story? This cannot be undone.")) return;
    try {
      await deletePost(id);
      showToast("Story deleted");
      await load();
    } catch {
      showToast("Failed to delete story", "error");
    }
  };

  if (loading) return <PageSkeleton variant="grid" />;

  const published = stories.filter((s) => s.status === "active").length;
  const drafts = stories.filter((s) => s.status === "draft" || !s.status).length;

  const categoryColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "success story":
        return "var(--green)";
      case "community spotlight":
        return "var(--gold)";
      case "interview":
        return "var(--teal)";
      case "feature":
        return "#8B5CF6";
      default:
        return "var(--text-muted)";
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <Link href="/admin" className="text-sm text-text-sec hover:underline mb-4 block">
        &larr; Back to Admin
      </Link>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-extrabold text-text">Stories</h2>
        <Button
          primary
          small
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Create Story"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Stories", value: stories.length },
          { label: "Published", value: published },
          { label: "Drafts", value: drafts },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 16 }}>
            <p className="text-2xl font-extrabold text-text">{s.value}</p>
            <p className="text-xs text-text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6" style={{ padding: 20 }}>
          <h3 className="text-base font-bold text-text mb-4">
            {editingId ? "Edit Story" : "New Story"}
          </h3>
          <div className="flex flex-col gap-3">
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Title"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm({
                  ...form,
                  title,
                  slug: editingId ? form.slug : slugify(title),
                });
              }}
            />
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Slug (auto-generated)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
            <textarea
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none resize-none"
              rows={6}
              placeholder="Content (supports markdown-like formatting)"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Author name"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
              placeholder="Featured image URL"
              value={form.featuredImage}
              onChange={(e) => setForm({ ...form, featuredImage: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as StoryCategory })
                }
              >
                {storyCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={form.status === "draft"}
                    onChange={() => setForm({ ...form, status: "draft" })}
                    className="accent-[var(--navy)]"
                  />
                  <span className="text-sm text-text">Draft</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={form.status === "published"}
                    onChange={() => setForm({ ...form, status: "published" })}
                    className="accent-[var(--navy)]"
                  />
                  <span className="text-sm text-text">Published</span>
                </label>
              </div>
            </div>
            <textarea
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none resize-none"
              rows={2}
              placeholder="Excerpt (short preview text)"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
            <Button primary small onClick={handleSave} className={saving ? "opacity-60" : ""}>
              {saving ? "Saving..." : editingId ? "Update Story" : "Create Story"}
            </Button>
          </div>
        </Card>
      )}

      {/* Stories List */}
      {stories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">&#128214;</p>
          <h3 className="text-lg font-bold text-text mb-1">No stories yet</h3>
          <p className="text-sm text-text-muted">Create your first story above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {stories.map((s) => {
            const cat = s.community || (s.type === "spotlight" ? "Community Spotlight" : "Success Story");
            const isPublished = s.status === "active";
            return (
              <Card key={s.id} style={{ padding: 16 }}>
                <div className="flex gap-4 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-text text-sm truncate m-0">
                        {s.title}
                      </p>
                      <Badge
                        text={cat}
                        color={categoryColor(cat)}
                        small
                      />
                      <Badge
                        text={isPublished ? "Published" : "Draft"}
                        color={isPublished ? "var(--green)" : "var(--text-muted)"}
                        bg={isPublished ? "var(--green-soft)" : undefined}
                        small
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      {s.author && <span>By {s.author}</span>}
                      {s.slug && <span>/{s.slug}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(s)}
                      className="text-xs px-2 py-1 rounded-lg bg-bg border border-border text-text-sec hover:bg-card cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-xs px-2 py-1 rounded-lg text-red-500 bg-bg border border-border hover:bg-red-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
