"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Post, Comment, ReactionType } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, MoreHorizontal, Trash2 } from "lucide-react";
import { getUserReaction, deletePost, toggleSavePost, isPostSaved } from "@/lib/firestore/social";
import ReactionBar from "@/components/social/ReactionBar";
import { ShareButton } from "@/components/social/ShareButton";
import ReportContentButton from "@/components/ReportContentButton";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";

interface PostCardProps {
    post: Post;
    onDeleted?: (postId: string) => void;
}

export function PostCard({ post, onDeleted }: PostCardProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
    const [saved, setSaved] = useState(false);
    const [savingBookmark, setSavingBookmark] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!user) {
            setUserReaction(null);
            return;
        }

        getUserReaction(post.id, user.uid)
            .then(setUserReaction)
            .catch((err) => {
                console.error("Failed to check reaction status:", err);
            });

        isPostSaved(user.uid, post.id)
            .then(setSaved)
            .catch(() => {});
    }, [post.id, user]);

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    const toggleComments = async () => {
        if (!showComments && comments.length === 0) {
            setCommentsLoading(true);
            try {
                const { getComments } = await import("@/lib/firestore/social");
                const loadedComments = await getComments(post.id);
                setComments(loadedComments);
            } catch (error) {
                console.error("Failed to load comments", error);
            } finally {
                setCommentsLoading(false);
            }
        }
        setShowComments(!showComments);
    };

    const handlePostComment = async () => {
        if (!user || !newComment.trim()) return;
        setSubmittingComment(true);
        try {
            const { addComment } = await import("@/lib/firestore/social");
            const comment = await addComment(post.id, {
                postId: post.id,
                authorId: user.uid,
                authorType: 'member',
                authorName: user.displayName || 'Anonymous',
                authorAvatarUrl: user.photoURL || undefined,
                content: newComment,
            });

            setComments(prev => [...prev, comment]);
            setNewComment("");
        } catch (error) {
            console.error("Failed to post comment", error);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleToggleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || savingBookmark) return;
        setSavingBookmark(true);
        try {
            const newSaved = !saved;
            await toggleSavePost(user.uid, post.id, newSaved);
            setSaved(newSaved);
            toast.success(newSaved ? "Post saved" : "Post unsaved");
        } catch (error) {
            console.error("Failed to toggle save:", error);
            toast.error("Failed to save post");
        } finally {
            setSavingBookmark(false);
        }
    };

    const handleDelete = async () => {
        if (!user || deleting) return;
        setDeleting(true);
        try {
            await deletePost(post.id, user.uid);
            toast.success("Post deleted");
            onDeleted?.(post.id);
        } catch (error) {
            console.error("Failed to delete post:", error);
            toast.error("Failed to delete post");
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
            setShowDropdown(false);
        }
    };

    const isAuthor = user?.uid === post.authorId;

    return (
        <Card className="mb-4 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-border/80 transition-colors cursor-pointer" onClick={() => router.push(`/posts/${post.id}`)}>
            <CardHeader className="flex flex-row items-center gap-4 p-4 pb-2">
                <Avatar>
                    <AvatarImage src={post.authorAvatarUrl} alt={post.authorName} />
                    <AvatarFallback>{post.authorName ? post.authorName[0] : "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{post.authorName}</h3>
                        <span className="text-xs text-muted-foreground">
                            {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{post.authorTagline}</p>
                </div>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="p-1.5 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {showDropdown && (
                        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-50 overflow-hidden">
                            {isAuthor && !confirmDelete && (
                                <button
                                    onClick={() => setConfirmDelete(true)}
                                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-slate-800 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Post
                                </button>
                            )}
                            {isAuthor && confirmDelete && (
                                <div className="px-4 py-3 space-y-2">
                                    <p className="text-xs text-slate-400">Delete this post?</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                        >
                                            {deleting ? "..." : "Yes, delete"}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="border-t border-slate-800">
                                <ReportContentButton
                                    contentType="post"
                                    contentId={post.id}
                                    contentTitle={post.content?.slice(0, 80)}
                                    variant="icon"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-3">
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>

                {/* Render Media */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="rounded-md overflow-hidden bg-muted/20">
                        <img src={post.mediaUrls[0]} alt="Post content" className="w-full h-auto object-cover max-h-96" />
                    </div>
                )}

                {/* Render Reference Content (Shared Job, etc) */}
                {post.type === 'share_job' && post.referenceData && (
                    <div className="border rounded-md p-3 bg-muted/30">
                        <p className="text-xs font-medium text-emerald-500 mb-1">Shared a Job</p>
                        <h4 className="font-semibold">{post.referenceData.title}</h4>
                        <p className="text-sm text-muted-foreground">{post.referenceData.employerName}</p>
                    </div>
                )}
            </CardContent>

            <CardFooter className="p-2 px-4 border-t flex flex-col items-stretch" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <ReactionBar
                            postId={post.id}
                            reactionsCount={post.reactionsCount || { love: 0, honor: 0, fire: 0 }}
                            commentsCount={post.commentsCount}
                            sharesCount={post.sharesCount}
                            userReaction={userReaction}
                            onCommentClick={toggleComments}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleToggleSave}
                            disabled={savingBookmark || !user}
                            className={`p-2 rounded-full transition-colors ${
                                saved
                                    ? "text-emerald-400"
                                    : "text-slate-500 hover:text-emerald-400"
                            }`}
                            title={saved ? "Unsave post" : "Save post"}
                        >
                            <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
                        </button>
                        <ShareButton
                            entityId={post.id}
                            type={post.type}
                            data={{ title: post.content?.slice(0, 60), provider: post.authorName }}
                            className="ml-0"
                        />
                    </div>
                </div>

                {/* Comments Section */}
                {showComments && (
                    <div className="w-full pt-2 border-t border-border/50">
                        <div className="space-y-4 mb-4">
                            {commentsLoading ? (
                                <p className="text-center text-xs text-muted-foreground py-2">Loading comments...</p>
                            ) : comments.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground py-2">No comments yet.</p>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={comment.authorAvatarUrl} />
                                            <AvatarFallback>{comment.authorName ? comment.authorName[0] : "?"}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 bg-muted/30 rounded-md p-2 text-xs">
                                            <span className="font-semibold block">{comment.authorName}</span>
                                            <span className="text-slate-300">{comment.content}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* New Comment Input */}
                        {user && (
                            <div className="flex gap-2 items-center">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.photoURL || undefined} />
                                    <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Write a comment..."
                                        className="w-full bg-muted/50 border border-transparent focus:border-emerald-500 rounded-full py-1 px-3 text-sm focus:outline-none transition-all"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handlePostComment();
                                        }}
                                        disabled={submittingComment}
                                    />
                                    <button
                                        onClick={handlePostComment}
                                        disabled={!newComment.trim() || submittingComment}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 disabled:text-muted-foreground text-xs font-semibold uppercase"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
