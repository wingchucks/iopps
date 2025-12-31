"use client";

import { useEffect, useState } from "react";
import { getFeedPosts } from "@/lib/firestore";
import { Post } from "@/lib/types";
import { PostCard } from "./PostCard";
import { CreatePost } from "./CreatePost";
import { Loader2 } from "lucide-react";

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
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No posts yet. Be the first to share something!</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))
                )}
            </div>
        </div>
    );
}
