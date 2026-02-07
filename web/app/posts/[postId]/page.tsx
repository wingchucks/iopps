"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getPost, getUserReaction } from "@/lib/firestore/social";
import type { Post, ReactionType, ReactionsCount } from "@/lib/types";
import ReactionBar from "@/components/social/ReactionBar";
import CommentThread from "@/components/social/CommentThread";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";

const DEFAULT_REACTIONS: ReactionsCount = { love: 0, honor: 0, fire: 0 };

function PostDetailContent() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const loadPost = async () => {
      try {
        setLoading(true);
        const [fetchedPost, reaction] = await Promise.all([
          getPost(postId),
          user ? getUserReaction(postId, user.uid) : Promise.resolve(null),
        ]);

        if (!fetchedPost) {
          setNotFound(true);
          return;
        }

        setPost(fetchedPost);
        setUserReaction(reaction);
      } catch (error) {
        console.error("Error loading post:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020306] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-[#020306]">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <button
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#14B8A6] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <p className="text-lg font-semibold text-slate-300">Post not found</p>
            <p className="mt-2 text-sm text-slate-500">
              This post may have been deleted or you don't have permission to view it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const timestamp = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true })
    : "Just now";

  return (
    <div className="min-h-screen bg-[#020306]">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        {/* Back nav */}
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#14B8A6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Post Content */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          {/* Author Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 flex-shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-400 overflow-hidden">
              {post.authorAvatarUrl ? (
                <img
                  src={post.authorAvatarUrl}
                  alt={post.authorName}
                  className="h-full w-full object-cover"
                />
              ) : (
                post.authorName?.[0] || "?"
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{post.authorName}</span>
                {post.authorType === "organization" && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                    Org
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {post.authorTagline && `${post.authorTagline} · `}{timestamp}
              </p>
            </div>
          </div>

          {/* Post Body */}
          <div className="mb-4">
            <p className="text-slate-200 whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Media */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="mb-4 rounded-xl overflow-hidden">
              {post.mediaUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Post media ${i + 1}`}
                  className="w-full h-auto object-cover max-h-96"
                />
              ))}
            </div>
          )}

          {/* Shared Entity */}
          {post.referenceData && post.type !== "status" && (
            <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <p className="text-xs font-medium text-emerald-400 mb-1">
                {post.type === "share_job" && "Shared a Job"}
                {post.type === "share_scholarship" && "Shared a Scholarship"}
                {post.type === "share_event" && "Shared an Event"}
                {post.type === "share_product" && "Shared a Product"}
              </p>
              <h4 className="font-semibold text-white">
                {post.referenceData.title}
              </h4>
              {post.referenceData.employerName && (
                <p className="text-sm text-slate-400">
                  {post.referenceData.employerName}
                </p>
              )}
            </div>
          )}

          {/* Reaction Bar */}
          <ReactionBar
            postId={post.id}
            reactionsCount={post.reactionsCount || DEFAULT_REACTIONS}
            commentsCount={post.commentsCount}
            sharesCount={post.sharesCount}
            userReaction={userReaction}
          />
        </div>

        {/* Comment Thread */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <CommentThread postId={post.id} />
        </div>
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  return (
    <ProtectedRoute>
      <PostDetailContent />
    </ProtectedRoute>
  );
}
