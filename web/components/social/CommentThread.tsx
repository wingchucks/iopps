"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  addComment,
  getThreadedComments,
  deleteComment,
  toggleLikeComment,
  hasUserLikedComment,
  type ThreadedComment,
} from "@/lib/firestore/social";
import { getEndorsementsForUser } from "@/lib/firestore/endorsements";
import { formatDistanceToNow } from "date-fns";
import { Heart, Loader2, MessageCircle, Reply, Send, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import toast from "react-hot-toast";

type SortMode = "newest" | "relevant";

interface CommentThreadProps {
  postId: string;
}

export default function CommentThread({ postId }: CommentThreadProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    const loadComments = async () => {
      try {
        setLoading(true);
        const threaded = await getThreadedComments(postId);
        setComments(threaded);
      } catch (error) {
        console.error("Error loading comments:", error);
        toast.error("Failed to load comments");
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [postId]);

  const sortedComments = useMemo(() => {
    if (sortMode === "relevant") {
      return [...comments].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    }
    return comments;
  }, [comments, sortMode]);

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      setSubmitting(true);

      // Check Elder status
      let isElder = false;
      try {
        const endorsements = await getEndorsementsForUser(user.uid);
        isElder = endorsements.some((e) => e.isElder);
      } catch {
        // Endorsement check is non-critical
      }

      const comment = await addComment(postId, {
        postId,
        authorId: user.uid,
        authorType: "member",
        authorName: user.displayName || "Anonymous",
        authorAvatarUrl: user.photoURL || undefined,
        content: newComment.trim(),
        isElder,
      });

      setComments((prev) => [
        ...prev,
        { ...comment, replies: [] } as ThreadedComment,
      ]);
      setNewComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!user || !replyText.trim()) return;

    try {
      setSubmitting(true);

      let isElder = false;
      try {
        const endorsements = await getEndorsementsForUser(user.uid);
        isElder = endorsements.some((e) => e.isElder);
      } catch {
        // non-critical
      }

      const comment = await addComment(postId, {
        postId,
        authorId: user.uid,
        authorType: "member",
        authorName: user.displayName || "Anonymous",
        authorAvatarUrl: user.photoURL || undefined,
        content: replyText.trim(),
        parentCommentId,
        isElder,
      });

      setComments((prev) =>
        prev.map((c) =>
          c.id === parentCommentId
            ? { ...c, replies: [...c.replies, { ...comment, replies: [] } as ThreadedComment] }
            : c
        )
      );
      setReplyText("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, parentId?: string | null) => {
    if (!user) return;
    try {
      await deleteComment(postId, commentId, user.uid);
      if (parentId) {
        // Remove reply from parent
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) }
              : c
          )
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-accent" />
          Comments ({comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)})
        </h3>

        {comments.length > 1 && (
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setSortMode("newest")}
              className={`px-2 py-1 rounded-full transition-colors ${
                sortMode === "newest"
                  ? "bg-accent/20 text-accent"
                  : "text-foreground0 hover:text-[var(--text-secondary)]"
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => setSortMode("relevant")}
              className={`px-2 py-1 rounded-full transition-colors ${
                sortMode === "relevant"
                  ? "bg-accent/20 text-accent"
                  : "text-foreground0 hover:text-[var(--text-secondary)]"
              }`}
            >
              Most Relevant
            </button>
          </div>
        )}
      </div>

      {comments.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-10 w-10" />}
          title="No comments yet"
          description="Be the first to share your thoughts."
          className="py-6 border-0 bg-transparent"
        />
      ) : (
        <div className="space-y-4">
          {sortedComments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                postId={postId}
                currentUserId={user?.uid}
                onReply={() => {
                  setReplyingTo(replyingTo === comment.id ? null : comment.id);
                  setReplyText("");
                }}
                onDelete={() => handleDeleteComment(comment.id)}
              />

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-10 mt-2 space-y-2 border-l-2 border-[var(--card-border)] pl-4">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      currentUserId={user?.uid}
                      isReply
                      onDelete={() => handleDeleteComment(reply.id, comment.id)}
                    />
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {replyingTo === comment.id && user && (
                <div className="ml-10 mt-2 flex items-center gap-2">
                  <div className="h-8 w-8 flex-shrink-0 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                    {user.displayName?.[0] || "?"}
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder={`Reply to ${comment.authorName}...`}
                      className="w-full rounded-full border border-[var(--card-border)] bg-surface px-4 py-2 text-sm text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmitReply(comment.id);
                      }}
                      disabled={submitting}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyText.trim() || submitting}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-accent disabled:text-[var(--text-secondary)]"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Comment Input */}
      {user && (
        <div className="flex items-center gap-3 pt-4 border-t border-[var(--card-border)]">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
            {user.displayName?.[0] || "?"}
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Write a comment..."
              className="w-full rounded-full border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitComment();
              }}
              disabled={submitting}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-accent disabled:text-[var(--text-secondary)]"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  postId,
  currentUserId,
  isReply,
  onReply,
  onDelete,
}: {
  comment: ThreadedComment;
  postId: string;
  currentUserId?: string;
  isReply?: boolean;
  onReply?: () => void;
  onDelete?: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    hasUserLikedComment(postId, comment.id, currentUserId)
      .then(setLiked)
      .catch((err) => {
        console.error("Failed to check comment like status:", err);
      });
  }, [postId, comment.id, currentUserId]);

  const handleToggleLike = async () => {
    if (!currentUserId || liking) return;
    setLiking(true);
    try {
      const nowLiked = await toggleLikeComment(postId, comment.id, currentUserId);
      setLiked(nowLiked);
      setLikesCount((c) => c + (nowLiked ? 1 : -1));
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLiking(false);
    }
  };

  const timestamp = comment.createdAt?.toDate
    ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })
    : "Just now";

  const isOwner = currentUserId && comment.authorId === currentUserId;

  return (
    <div className="flex gap-3 group">
      <div
        className={`flex-shrink-0 rounded-full bg-surface flex items-center justify-center text-xs font-bold text-[var(--text-muted)] ${
          isReply ? "h-7 w-7" : "h-9 w-9"
        }`}
      >
        {comment.authorAvatarUrl ? (
          <img
            src={comment.authorAvatarUrl}
            alt={comment.authorName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          comment.authorName?.[0] || "?"
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl bg-surface px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {comment.authorName}
            </span>
            {comment.isElder && (
              <span
                className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full flex items-center gap-1"
                title="Elder"
              >
                {"\uD83E\uDEB6"} Elder
              </span>
            )}
            {isOwner && onDelete && (
              <button
                onClick={onDelete}
                className="ml-auto opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-red-400 transition-all"
                title="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5 whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>
        <div className="flex items-center gap-4 mt-1 px-2">
          <span className="text-xs text-foreground0">{timestamp}</span>
          <button
            onClick={handleToggleLike}
            disabled={!currentUserId || liking}
            className={`flex items-center gap-1 text-xs transition-colors ${
              liked
                ? "text-rose-400"
                : "text-foreground0 hover:text-rose-400"
            }`}
          >
            <Heart className={`h-3 w-3 ${liked ? "fill-current" : ""}`} />
            {likesCount > 0 && likesCount}
          </button>
          {onReply && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-xs text-foreground0 hover:text-accent transition-colors"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
