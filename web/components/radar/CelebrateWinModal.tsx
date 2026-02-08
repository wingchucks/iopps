"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TrophyIcon } from "@heroicons/react/24/solid";

interface CelebrateWinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CelebrateWinModal({ isOpen, onClose }: CelebrateWinModalProps) {
    const [content, setContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async () => {
        setIsPosting(true);
        // Simulate network request
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Reset and close
        setIsPosting(false);
        setContent("");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-[#0F172A] border-[var(--card-border)] text-foreground">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-500/40">
                        <TrophyIcon className="h-8 w-8 text-amber-500" />
                    </div>
                    <DialogTitle className="text-center text-xl text-white">
                        Celebrate a Win!
                    </DialogTitle>
                    <div className="text-center text-sm text-[var(--text-muted)]">
                        Share your success with the community. Big or small, every win counts!
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Textarea
                        placeholder="I just completed my certification in..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[120px] resize-none border-[var(--card-border)] bg-surface text-foreground placeholder:text-foreground0 focus:border-amber-500/50 focus:ring-amber-500/20"
                    />
                </div>

                <DialogFooter className="sm:justify-center">
                    <Button
                        onClick={handlePost}
                        disabled={!content.trim() || isPosting}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 font-bold text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
                    >
                        {isPosting ? "Posting..." : "Share Win 🎉"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
