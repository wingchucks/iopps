"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  addComment,
  getThreadedComments,
  type ThreadedComment,
} from "@/lib/firestore/social";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageCircle, Reply, Send } from "lucide-react";
import toast from "react-hot-toast";

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

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      setSubmitting(true);
      const comment = await addComment(postId, {
        postId,
        authorId: user.uid,
        authorType: "member",
        authorName: user.displayName || "Anonymous",
        authorAvatarUrl: user.photoURL || undefined,
        content: newComment.trim(),
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
      const comment = await addComment(postId, {
        postId,
        authorId: user.uid,
        authorType: "member",
        authorName: user.displayName || "Anonymous",
        authorAvatarUrl: user.photoURL || undefined,
        content: replyText.trim(),
        parentCommentId,
      });

      // Add reply to the correct parent
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-emerald-400" />
        Comments ({comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)})
      </h3>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={() => {
                  setReplyingTo(replyingTo === comment.id ? null : comment.id);
                  setReplyText("");
                }}
              />

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-10 mt-2 space-y-2 border-l-2 border-slate-800 pl-4">
                  {comment.replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} isReply />
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {replyingTo === comment.id && user && (
                <div className="ml-10 mt-2 flex items-center gap-2">
                  <div className="h-8 w-8 flex-shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                    {user.displayName?.[0] || "?"}
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder={`Reply to ${comment.authorName}...`}
                      className="w-full rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 disabled:text-slate-600"
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
        <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
            {user.displayName?.[0] || "?"}
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Write a comment..."
              className="w-full rounded-full border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 disabled:text-slate-600"
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
  isReply,
  onReply,
}: {
  comment: ThreadedComment;
  isReply?: boolean;
  onReply?: () => void;
}) {
  const timestamp = comment.createdAt?.toDate
    ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })
    : "Just now";

  return (
    <div className="flex gap-3">
      <div
        className={`flex-shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 ${
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
        <div className="rounded-2xl bg-slate-800/50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">
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
          </div>
          <p className="text-sm text-slate-300 mt-0.5 whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>
        <div className="flex items-center gap-4 mt-1 px-2">
          <span className="text-xs text-slate-500">{timestamp}</span>
          {onReply && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
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
