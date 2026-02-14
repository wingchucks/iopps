"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { shareEntity } from "@/lib/firestore/social";
import { useAuth } from "@/components/AuthProvider"; // Correct path
import { useToast } from "@/components/ui/use-toast";
import { PostType } from "@/lib/types";

interface ShareButtonProps {
    entityId: string;
    type: PostType; // e.g., 'share_job'
    data: Record<string, string | undefined>; // The entity data (e.g. Job object)
    className?: string; // Styled trigger button
}

export function ShareButton({ entityId, type, data, className }: ShareButtonProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [comment, setComment] = useState("");
    const [sharing, setSharing] = useState(false);

    const handleShare = async () => {
        if (!user) return; // Should show login modal or something

        setSharing(true);
        try {
            await shareEntity(
                user.uid,
                { name: user.displayName || user.email || 'Anonymous', avatarUrl: user.photoURL || undefined },
                type,
                entityId,
                data,
                comment
            );

            toast({ title: "Shared!", description: "Posted to your network." });
            setOpen(false);
            setComment("");
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to share.", variant: "destructive" });
        } finally {
            setSharing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className={`gap-2 text-muted-foreground ${className}`}>
                    <Share2 className="h-4 w-4" />
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Share to Feed</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        placeholder="Say something about this..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[100px]"
                    />

                    {/* Preview of what's being shared */}
                    <div className="rounded border bg-muted/30 p-3 text-sm">
                        <div className="font-semibold">{data.title || data.name || "Content"}</div>
                        <div className="text-xs text-muted-foreground">{data.employerName || data.provider || "IOPPS"}</div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleShare} disabled={sharing} className="bg-accent hover:bg-emerald-700 text-white">
                        {sharing ? "Sharing..." : "Post"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
