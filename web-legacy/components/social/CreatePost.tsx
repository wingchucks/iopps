"use client";

import FileUploader from "@/components/FileUploader";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon, Link as LinkIcon, Smile } from "lucide-react";
import { createPost } from "@/lib/firestore";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/use-toast";

interface CreatePostProps {
    onPostCreated?: () => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps = {}) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMedia, setShowMedia] = useState(false);
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim() || !user) return;

        setIsSubmitting(true);
        try {
            await createPost({
                authorId: user.uid,
                authorType: 'member', // TODO: support organization posting
                authorName: user.displayName || user.email || 'Anonymous',
                authorAvatarUrl: user.photoURL || undefined,
                content: content,
                type: 'status',
                visibility: 'public',
                mediaUrls: mediaUrls
            });

            setContent("");
            setMediaUrls([]);
            setShowMedia(false);
            toast({
                title: "Posted!",
                description: "Your update is live.",
            });

            onPostCreated?.();
        } catch (error) {
            console.error("Failed to post", error);
            toast({
                title: "Error",
                description: "Failed to create post. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="mb-6 shadow-sm border-border/50">
            <CardContent className="p-4">
                <div className="flex gap-4">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.photoURL || undefined} />
                        <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4">
                        <Textarea
                            placeholder="Start a post..."
                            className="min-h-[80px] bg-transparent border-0 focus-visible:ring-0 p-2 resize-none text-base"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />

                        {/* Media Preview / Upload Area */}
                        {(showMedia || mediaUrls.length > 0) && (
                            <div className="space-y-3 p-3 bg-muted/30 rounded-md">
                                {mediaUrls.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {mediaUrls.map((url, idx) => (
                                            <div key={idx} className="relative aspect-video bg-black/5 rounded overflow-hidden">
                                                <img src={url} alt="Upload" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => setMediaUrls(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                                                >
                                                    <XMarkIcon className="h-4 w-4" />
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
                                        storagePath={`post_images/${user?.uid || 'temp'}`}
                                        onUploadComplete={(url) => {
                                            setMediaUrls(prev => [...prev, url]);
                                            setUploading(false);
                                        }}
                                        onError={(err) => {
                                            console.error(err);
                                            toast({ title: "Upload failed", description: err, variant: "destructive" });
                                            setUploading(false);
                                        }}
                                        className="h-24"
                                    />
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t pt-3">
                            <div className="flex gap-2">
                                <Button
                                    variant={showMedia ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setShowMedia(!showMedia)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <ImageIcon className="h-4 w-4 mr-2" />
                                    Media
                                </Button>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                    <Smile className="h-4 w-4 mr-2" />
                                    Feeling
                                </Button>
                            </div>
                            <Button
                                onClick={handleSubmit}
                                disabled={!content.trim() || isSubmitting}
                                className="bg-accent hover:bg-emerald-700 text-white"
                            >
                                {isSubmitting ? "Posting..." : "Post"}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
