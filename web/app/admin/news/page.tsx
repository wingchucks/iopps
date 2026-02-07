"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  listNewsArticles,
  createNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
} from "@/lib/firestore/news";
import type { NewsArticle, NewsCategory, NewsStatus } from "@/lib/types";
import {
  AdminLoadingState,
  AdminEmptyState,
  StatusBadge,
  ConfirmationModal,
} from "@/components/admin";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  NewspaperIcon,
} from "@heroicons/react/24/outline";
import { Timestamp } from "firebase/firestore";
import toast from "react-hot-toast";

// ============================================================================
// Types
// ============================================================================

interface FormData {
  title: string;
  excerpt: string;
  source: string;
  sourceUrl: string;
  category: NewsCategory;
  imageUrl: string;
  tags: string;
  featured: boolean;
  businessIdea: boolean;
  businessIdeaDetails: string;
  status: NewsStatus;
}

const EMPTY_FORM: FormData = {
  title: "",
  excerpt: "",
  source: "",
  sourceUrl: "",
  category: "business",
  imageUrl: "",
  tags: "",
  featured: false,
  businessIdea: false,
  businessIdeaDetails: "",
  status: "draft",
};

const CATEGORIES: { value: NewsCategory; label: string }[] = [
  { value: "business", label: "Business" },
  { value: "culture", label: "Culture" },
  { value: "policy", label: "Policy" },
  { value: "sports", label: "Sports" },
];

// ============================================================================
// Helper
// ============================================================================

function formatDate(ts: any): string {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// Form Component
// ============================================================================

function ArticleForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  isEditing,
  saving,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  saving: boolean;
}) {
  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1";

  return (
    <div className="rounded-xl border border-slate-800 bg-[#08090C] p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-100">
          {isEditing ? "Edit Article" : "New Article"}
        </h2>
        <button
          onClick={onCancel}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className={labelClass}>Title *</label>
          <input
            className={inputClass}
            placeholder="Article headline"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        {/* Excerpt */}
        <div className="md:col-span-2">
          <label className={labelClass}>Excerpt *</label>
          <textarea
            className={inputClass}
            rows={3}
            placeholder="Brief summary of the article..."
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
        </div>

        {/* Source */}
        <div>
          <label className={labelClass}>Source *</label>
          <input
            className={inputClass}
            placeholder="e.g. CBC News"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />
        </div>

        {/* Source URL */}
        <div>
          <label className={labelClass}>Source URL *</label>
          <input
            className={inputClass}
            placeholder="https://..."
            value={form.sourceUrl}
            onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>Category</label>
          <select
            className={inputClass}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as NewsCategory })}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Image URL */}
        <div>
          <label className={labelClass}>Image URL</label>
          <input
            className={inputClass}
            placeholder="https://... (optional)"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />
        </div>

        {/* Tags */}
        <div className="md:col-span-2">
          <label className={labelClass}>Tags (comma-separated)</label>
          <input
            className={inputClass}
            placeholder="e.g. reconciliation, first-nations, economic-development"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </div>

        {/* Status */}
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={inputClass}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as NewsStatus })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-6 pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-300">Featured</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.businessIdea}
              onChange={(e) => setForm({ ...form, businessIdea: e.target.checked })}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-300">Business Idea</span>
          </label>
        </div>

        {/* Business Idea Details (conditional) */}
        {form.businessIdea && (
          <div className="md:col-span-2">
            <label className={labelClass}>Business Idea Details</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Why this is a great business opportunity..."
              value={form.businessIdeaDetails}
              onChange={(e) => setForm({ ...form, businessIdeaDetails: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-800">
        <button
          onClick={onSubmit}
          disabled={saving || !form.title || !form.excerpt || !form.source || !form.sourceUrl}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : isEditing ? "Update Article" : "Create Article"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AdminNewsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning" | "success" | "info";
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "danger",
    confirmText: "Confirm",
    onConfirm: () => {},
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }
    loadArticles();
  }, [user, role, authLoading, router]);

  async function loadArticles() {
    try {
      setLoading(true);
      const data = await listNewsArticles({ status: "all", limitCount: 200 });
      setArticles(data);
    } catch (err) {
      console.error("Error loading articles:", err);
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(article: NewsArticle) {
    setEditingId(article.id);
    setForm({
      title: article.title,
      excerpt: article.excerpt,
      source: article.source,
      sourceUrl: article.sourceUrl,
      category: article.category,
      imageUrl: article.imageUrl || "",
      tags: article.tags?.join(", ") || "",
      featured: article.featured,
      businessIdea: article.businessIdea,
      businessIdeaDetails: article.businessIdeaDetails || "",
      status: article.status,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit() {
    if (!user) return;
    setSaving(true);

    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const articleData = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        source: form.source.trim(),
        sourceUrl: form.sourceUrl.trim(),
        category: form.category,
        imageUrl: form.imageUrl.trim() || undefined,
        tags,
        featured: form.featured,
        businessIdea: form.businessIdea,
        businessIdeaDetails: form.businessIdea ? form.businessIdeaDetails.trim() : undefined,
        status: form.status,
        publishedAt: form.status === "published" ? Timestamp.now() : null,
        createdBy: user.uid,
      };

      if (editingId) {
        const { createdBy, ...updateData } = articleData;
        await updateNewsArticle(editingId, updateData);
        toast.success("Article updated");
      } else {
        await createNewsArticle(articleData);
        toast.success("Article created");
      }

      cancelForm();
      loadArticles();
    } catch (err) {
      console.error("Error saving article:", err);
      toast.error("Failed to save article");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteNewsArticle(id);
      toast.success("Article deleted");
      loadArticles();
    } catch (err) {
      console.error("Error deleting article:", err);
      toast.error("Failed to delete article");
    }
  }

  async function handleToggleStatus(article: NewsArticle) {
    const newStatus: NewsStatus = article.status === "published" ? "draft" : "published";
    try {
      await updateNewsArticle(article.id, {
        status: newStatus,
        publishedAt: newStatus === "published" ? Timestamp.now() : null,
      });
      toast.success(newStatus === "published" ? "Article published" : "Article unpublished");
      loadArticles();
    } catch (err) {
      console.error("Error toggling status:", err);
      toast.error("Failed to update status");
    }
  }

  // Filter articles
  const filteredArticles =
    filter === "all"
      ? articles
      : articles.filter((a) => a.status === filter);

  if (authLoading || loading) {
    return <AdminLoadingState message="Loading news articles..." />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Indigenous News</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage curated news articles for the community
          </p>
        </div>
        <button
          onClick={() => {
            cancelForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
        >
          <PlusIcon className="h-4 w-4" />
          New Article
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <ArticleForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onCancel={cancelForm}
          isEditing={!!editingId}
          saving={saving}
        />
      )}

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2">
        {(["all", "published", "draft"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "bg-teal-600/20 text-teal-400"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            {f === "all" ? "All" : f === "published" ? "Published" : "Drafts"}
            <span className="ml-1.5 text-xs opacity-70">
              ({f === "all" ? articles.length : articles.filter((a) => a.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* Articles Table */}
      {filteredArticles.length === 0 ? (
        <AdminEmptyState
          title="No articles found"
          message={
            filter === "all"
              ? "Create your first news article to get started."
              : `No ${filter} articles. Try a different filter.`
          }
          icon={<NewspaperIcon className="h-12 w-12" />}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#08090C]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-4 py-3 font-medium text-slate-400">Title</th>
                  <th className="hidden px-4 py-3 font-medium text-slate-400 md:table-cell">Category</th>
                  <th className="hidden px-4 py-3 font-medium text-slate-400 sm:table-cell">Status</th>
                  <th className="hidden px-4 py-3 font-medium text-slate-400 lg:table-cell">Source</th>
                  <th className="hidden px-4 py-3 font-medium text-slate-400 lg:table-cell">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium text-slate-200 line-clamp-1">
                            {article.title}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {article.excerpt}
                          </div>
                        </div>
                        {article.featured && (
                          <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                            FEATURED
                          </span>
                        )}
                        {article.businessIdea && (
                          <span className="shrink-0 rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">
                            BIZ IDEA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 capitalize">
                        {article.category}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <StatusBadge
                        status={article.status === "published" ? "active" : "inactive"}
                        variant={article.status === "published" ? "success" : "warning"}
                      />
                    </td>
                    <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">
                      {article.source}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-400 lg:table-cell whitespace-nowrap">
                      {formatDate(article.publishedAt || article.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleStatus(article)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                            article.status === "published"
                              ? "text-amber-400 hover:bg-amber-500/10"
                              : "text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {article.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={() => startEdit(article)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              title: "Delete Article",
                              message: `Are you sure you want to delete "${article.title}"? This cannot be undone.`,
                              variant: "danger",
                              confirmText: "Delete",
                              onConfirm: () => {
                                handleDelete(article.id);
                                setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                              },
                            })
                          }
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
