"use client";

import { useState } from "react";
import { Post, Comment } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { toggleLikePost } from "@/lib/firestore";
import { useAuth } from "@/components/AuthProvider";

interface PostCardProps {
    post: Post;
}

export function PostCard({ post }: PostCardProps) {
    const { user } = useAuth();
    const [liked, setLiked] = useState(false); // TODO: Check if user already liked
    const [likesCount, setLikesCount] = useState(post.likesCount);

    const handleLike = async () => {
        if (!user) return;

        // Optimistic update
        const newLiked = !liked;
        setLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

        try {
            await toggleLikePost(post.id, user.uid);
        } catch (error) {
            // Revert if failed
            setLiked(!newLiked);
            setLikesCount(prev => !newLiked ? prev + 1 : prev - 1);
            console.error("Failed to toggle like", error);
        }
    };

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    const toggleComments = async () => {
        if (!showComments && comments.length === 0) {
            setCommentsLoading(true);
            try {
                // Determine authorType - default to member for now
                // Ideally this would come from a cleaner reusable import
                // But for now verify we have the import
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
                authorType: 'member', // TODO use actual type
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

    return (
        <Card className="mb-4 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-border/80 transition-colors">
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
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-3">
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>

                {/* Render Media */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="rounded-md overflow-hidden bg-muted/20">
                        {/* Simple single image for now */}
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

            <CardFooter className="p-2 px-4 border-t flex flex-col items-stretch">
                <div className="flex justify-between w-full mb-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 ${liked ? 'text-red-500' : 'text-muted-foreground'}`}
                        onClick={handleLike}
                    >
                        <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                        <span>{likesCount}</span>
                    </Button>

                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={toggleComments}>
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.commentsCount}</span>
                    </Button>

                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                        <Share2 className="h-4 w-4" />
                        <span>{post.sharesCount}</span>
                    </Button>
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
