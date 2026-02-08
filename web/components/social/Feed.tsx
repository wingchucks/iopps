"use client";

import { useEffect, useState } from "react";
import { getFeedPosts } from "@/lib/firestore";
import { Post } from "@/lib/types";
import { PostCard } from "./PostCard";
import { CreatePost } from "./CreatePost";
import { Loader2, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function Feed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadFeed() {
            try {
                const { posts: newPosts } = await getFeedPosts();
                setPosts(newPosts);
            } catch (error) {
                console.error("Failed to load feed", error);
            } finally {
                setLoading(false);
            }
        }

        loadFeed();
    }, []);

    return (
        <div className="max-w-2xl mx-auto py-6">
            <CreatePost />

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : posts.length === 0 ? (
                    <EmptyState
                        icon={<MessageSquare className="h-12 w-12" />}
                        title="No posts yet"
                        description="Be the first to share something!"
                    />
                ) : (
                    posts.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))
                )}
            </div>
        </div>
    );
}
