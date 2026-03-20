"use client";

import { useState, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { createMemberPost } from "@/lib/firestore/posts";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export default function CreatePostModal({
  open,
  onClose,
  onPostCreated,
}: CreatePostModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open || !user) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5 MB", "error");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      showToast("Please write something to share", "error");
      return;
    }

    setSubmitting(true);
    try {
      let featuredImage: string | undefined;
      if (imageFile) {
        const storageRef = ref(
          storage,
          `posts/${user.uid}/${Date.now()}-${imageFile.name}`
        );
        await uploadBytes(storageRef, imageFile);
        featuredImage = await getDownloadURL(storageRef);
      }

      await createMemberPost({
        title: title.trim() || content.trim().slice(0, 60),
        description: content.trim(),
        type: "story",
        authorUid: user.uid,
        authorName: user.displayName || "Community Member",
        authorPhoto: user.photoURL || undefined,
        featuredImage,
      });

      showToast("Post shared successfully!");
      setContent("");
      setTitle("");
      removeImage();
      onPostCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create post:", err);
      showToast("Failed to share post. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        style={{ border: "1.5px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-border"
          style={{ padding: "14px 20px" }}
        >
          <h3 className="text-base font-bold text-text m-0">Share a Post</h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 flex items-center justify-center rounded-full border-none cursor-pointer text-lg text-text-muted"
            style={{ background: "var(--border)" }}
          >
            &#10005;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px" }}>
          {/* Author row */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar
              name={user.displayName || "U"}
              size={40}
              src={user.photoURL || undefined}
            />
            <div>
              <p className="text-sm font-bold text-text m-0">
                {user.displayName || "Community Member"}
              </p>
              <p className="text-xs text-text-muted m-0">Sharing to community</p>
            </div>
          </div>

          {/* Title (optional) */}
          <input
            type="text"
            placeholder="Add a title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="w-full text-sm font-semibold text-text mb-3 border-none outline-none"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--bg)",
              border: "1.5px solid var(--border)",
            }}
          />

          {/* Content */}
          <textarea
            placeholder="What's on your mind? Share a story, experience, or update..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full text-sm text-text resize-none outline-none"
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--bg)",
              border: "1.5px solid var(--border)",
              fontFamily: "inherit",
            }}
          />
          <p className="text-[11px] text-text-muted text-right m-0 mt-1">
            {content.length}/2000
          </p>

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-[200px] object-cover rounded-xl"
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full border-none cursor-pointer text-white text-sm"
                style={{ background: "rgba(0,0,0,.6)" }}
              >
                &#10005;
              </button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between border-t border-border"
          style={{ padding: "12px 20px" }}
        >
          <button
            onClick={() => fileRef.current?.click()}
            disabled={submitting}
            className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer border-none rounded-lg"
            style={{
              padding: "8px 14px",
              background: "var(--bg)",
              color: "var(--text-sec)",
              border: "1.5px solid var(--border)",
            }}
          >
            &#128247; Photo
          </button>
          <Button
            primary
            small
            onClick={handleSubmit}
            style={{ opacity: submitting || !content.trim() ? 0.5 : 1 }}
          >
            {submitting ? "Posting..." : "Share Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
