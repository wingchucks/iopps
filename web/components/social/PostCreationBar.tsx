"use client";

import { useState, useRef, useEffect } from "react";
import {
  Briefcase,
  Calendar,
  Trophy,
  ImageIcon,
  Link as LinkIcon,
  X,
  ChevronDown,
  Loader2,
  Globe,
  Users,
} from "lucide-react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import FileUploader from "@/components/FileUploader";
import { createPost } from "@/lib/firestore";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import type { PostType, PostVisibility, AchievementType } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────
type PostMode = "text" | "job" | "event" | "achievement" | "photo" | "link";

interface PostCreationBarProps {
  onPostCreated?: () => void;
}

const ACHIEVEMENT_OPTIONS: { value: AchievementType; label: string; emoji: string }[] = [
  { value: "new_job", label: "I got a new job!", emoji: "\uD83C\uDF89" },
  { value: "completed_training", label: "I completed a training program!", emoji: "\uD83C\uDF93" },
  { value: "earned_certification", label: "I earned a certification!", emoji: "\uD83C\uDFC5" },
  { value: "promotion", label: "I got a promotion!", emoji: "\uD83D\uDE80" },
  { value: "graduation", label: "I graduated!", emoji: "\uD83C\uDF93" },
  { value: "custom", label: "Something else...", emoji: "\u2728" },
];

const POST_MODES: { id: PostMode; label: string; icon: React.ElementType; color: string }[] = [
  { id: "text", label: "Text", icon: Globe, color: "var(--accent)" },
  { id: "job", label: "Share a Job", icon: Briefcase, color: "#0D9488" },
  { id: "event", label: "Share an Event", icon: Calendar, color: "#8B5CF6" },
  { id: "achievement", label: "Achievement", icon: Trophy, color: "#F59E0B" },
  { id: "photo", label: "Photo", icon: ImageIcon, color: "#EC4899" },
  { id: "link", label: "Link", icon: LinkIcon, color: "#3B82F6" },
];

// ─── Component ───────────────────────────────────────────────────────
export function PostCreationBar({ onPostCreated }: PostCreationBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<PostMode>("text");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo state
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [_uploading, setUploading] = useState(false);

  // Achievement state
  const [achievementType, setAchievementType] = useState<AchievementType | "">("");

  // Link state
  const [linkUrl, setLinkUrl] = useState("");

  // Job/Event share state
  const [shareUrl, setShareUrl] = useState("");

  // Focus textarea when expanding
  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  if (!user) return null;

  const handleExpand = () => {
    setExpanded(true);
  };

  const handleCollapse = () => {
    setExpanded(false);
    resetForm();
  };

  const resetForm = () => {
    setContent("");
    setMode("text");
    setVisibility("public");
    setMediaUrls([]);
    setAchievementType("");
    setLinkUrl("");
    setShareUrl("");
  };

  const getPostType = (): PostType => {
    switch (mode) {
      case "job": return "share_job";
      case "event": return "share_event";
      case "achievement": return "achievement";
      case "link": return "share_link";
      default: return "status";
    }
  };

  const canSubmit = (): boolean => {
    if (isSubmitting) return false;
    if (!content.trim() && mode !== "photo") return false;
    if (mode === "photo" && mediaUrls.length === 0 && !content.trim()) return false;
    if (mode === "achievement" && !achievementType) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || !user) return;

    setIsSubmitting(true);
    try {
      const postType = getPostType();

      // Build referenceData for shared content
      let referenceData: Record<string, string | undefined> | undefined;
      if (mode === "job" && shareUrl.trim()) {
        referenceData = { url: shareUrl.trim() };
      } else if (mode === "event" && shareUrl.trim()) {
        referenceData = { url: shareUrl.trim() };
      }

      await createPost({
        authorId: user.uid,
        authorType: "member",
        authorName: user.displayName || user.email || "Anonymous",
        authorAvatarUrl: user.photoURL || undefined,
        content: content,
        type: postType,
        visibility,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        achievementType: achievementType || undefined,
        linkUrl: mode === "link" ? linkUrl.trim() : undefined,
        referenceData,
      });

      toast({
        title: "Posted!",
        description: "Your update is live.",
      });

      handleCollapse();
      onPostCreated?.();
    } catch (error) {
      console.error("Failed to post:", error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  // ─── Collapsed State ────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-surface mb-4 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover rounded-full" />
              ) : (
                <span className="text-sm font-bold text-accent">{initials}</span>
              )}
            </div>

            {/* Placeholder input */}
            <button
              onClick={handleExpand}
              className="flex-1 text-left px-4 py-2.5 rounded-full border border-[var(--card-border)] bg-background text-[var(--text-muted)] text-sm hover:bg-surface hover:border-[var(--text-muted)] transition-colors"
            >
              What&apos;s on your mind?
            </button>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-[var(--card-border)]">
            {POST_MODES.slice(1).map((pm) => (
              <button
                key={pm.id}
                onClick={() => {
                  setMode(pm.id);
                  setExpanded(true);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:bg-background transition-colors"
              >
                <pm.icon className="h-4 w-4" style={{ color: pm.color }} />
                <span className="hidden sm:inline">{pm.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Expanded State ─────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-surface mb-4 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Create Post</h3>
        <button
          onClick={handleCollapse}
          className="p-1.5 rounded-full text-[var(--text-muted)] hover:bg-background hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="h-full w-full object-cover rounded-full" />
            ) : (
              <span className="text-sm font-bold text-accent">{initials}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{user.displayName || "Member"}</p>
            {/* Visibility selector */}
            <button
              onClick={() => setVisibility(visibility === "public" ? "connections" : "public")}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-foreground transition-colors"
            >
              {visibility === "public" ? (
                <>
                  <Globe className="h-3 w-3" /> Public
                </>
              ) : (
                <>
                  <Users className="h-3 w-3" /> Connections Only
                </>
              )}
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Post type indicator (if not text) */}
        {mode !== "text" && (
          <div className="mb-3">
            {(() => {
              const pm = POST_MODES.find((p) => p.id === mode);
              if (!pm) return null;
              return (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: pm.color + "15", color: pm.color }}
                >
                  <pm.icon className="h-3.5 w-3.5" />
                  {pm.label}
                  <button
                    onClick={() => setMode("text")}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })()}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            mode === "achievement"
              ? "Tell everyone about your achievement..."
              : mode === "job"
              ? "Know someone who'd be great for this? Share your thoughts..."
              : mode === "event"
              ? "What makes this event worth attending?"
              : mode === "link"
              ? "What did you find interesting about this?"
              : "What's on your mind?"
          }
          rows={3}
          className="w-full bg-transparent text-foreground text-sm placeholder-[var(--text-muted)] resize-none focus:outline-none leading-relaxed"
        />

        {/* ── Achievement Selector ─────────────────────────────── */}
        {mode === "achievement" && (
          <div className="mb-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
              What are you celebrating?
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ACHIEVEMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAchievementType(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                    achievementType === opt.value
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      : "bg-background text-[var(--text-muted)] hover:bg-amber-500/10 border border-transparent"
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Job / Event URL Input ────────────────────────────── */}
        {(mode === "job" || mode === "event") && (
          <div className="mb-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--card-border)] bg-background">
              <LinkIcon className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
              <input
                type="url"
                value={shareUrl}
                onChange={(e) => setShareUrl(e.target.value)}
                placeholder={mode === "job" ? "Paste job URL (optional)" : "Paste event URL (optional)"}
                className="flex-1 bg-transparent text-sm text-foreground placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ── Link URL Input ───────────────────────────────────── */}
        {mode === "link" && (
          <div className="mb-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--card-border)] bg-background">
              <LinkIcon className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Paste a link..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ── Photo Upload ─────────────────────────────────────── */}
        {(mode === "photo" || mediaUrls.length > 0) && (
          <div className="mb-3 p-3 rounded-lg border border-[var(--card-border)] bg-background">
            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {mediaUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-black/5">
                    <img src={url} alt="Upload" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {mediaUrls.length < 4 && (
              <FileUploader
                label={mediaUrls.length > 0 ? "Add another image" : "Upload image"}
                accept=".jpg,.jpeg,.png,.webp,.gif"
                maxSizeMB={5}
                storagePath={`post_images/${user.uid}`}
                onUploadComplete={(url) => {
                  setMediaUrls((prev) => [...prev, url]);
                  setUploading(false);
                }}
                onError={(err) => {
                  console.error(err);
                  toast({ title: "Upload failed", description: err, variant: "destructive" });
                  setUploading(false);
                }}
                className="h-20"
              />
            )}
          </div>
        )}
      </div>

      {/* ── Footer: Mode selectors + Post button ──────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--card-border)]">
        <div className="flex items-center gap-1">
          {POST_MODES.slice(1).map((pm) => (
            <button
              key={pm.id}
              onClick={() => setMode(mode === pm.id ? "text" : pm.id)}
              title={pm.label}
              className={`p-2 rounded-lg transition-colors ${
                mode === pm.id
                  ? "bg-background"
                  : "hover:bg-background"
              }`}
            >
              <pm.icon
                className="h-5 w-5"
                style={{ color: mode === pm.id ? pm.color : "var(--text-muted)" }}
              />
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}
