"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { followOrganization, unfollowOrganization, getOrganizationFollowStatus } from "@/lib/firestore/social";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/use-toast";

interface FollowButtonProps {
    targetOrgId: string;
    className?: string;
    initialIsFollowing?: boolean;
    onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({ targetOrgId, className, initialIsFollowing, onFollowChange }: FollowButtonProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing || false);
    const [loading, setLoading] = useState(!initialIsFollowing && true); // Load if we don't have initial state

    useEffect(() => {
        if (!user || user.uid === targetOrgId) { // Organization can't follow itself (if logged as org)
            setLoading(false);
            return;
        }

        // If initial state was provided, trust it but maybe verify eventually. 
        // For now if not provided, fetch it.
        if (initialIsFollowing === undefined) {
            async function checkStatus() {
                try {
                    const status = await getOrganizationFollowStatus(user!.uid, targetOrgId);
                    setIsFollowing(status);
                } catch (error) {
                    console.error("Failed to check follow status", error);
                } finally {
                    setLoading(false);
                }
            }
            checkStatus();
        } else {
            setLoading(false);
        }
    }, [user, targetOrgId, initialIsFollowing]);

    const handleToggleFollow = async () => {
        if (!user) return;
        setLoading(true);
        const newState = !isFollowing;

        // Optimistic update
        setIsFollowing(newState);
        if (onFollowChange) onFollowChange(newState);

        try {
            if (newState) {
                await followOrganization(user.uid, targetOrgId);
                toast({ title: "Following", description: "You will now see updates from this organization." });
            } else {
                await unfollowOrganization(user.uid, targetOrgId);
            }
        } catch (error) {
            // Revert on error
            setIsFollowing(!newState);
            if (onFollowChange) onFollowChange(!newState);
            toast({ title: "Error", description: "Failed to update follow status.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Button disabled size="sm" variant="ghost" className={className}>Loading...</Button>;

    return (
        <Button
            size="sm"
            onClick={handleToggleFollow}
            variant={isFollowing ? "outline" : "primary"}
            className={`gap-2 transition-all ${isFollowing
                ? "border-accent/50 text-accent hover:bg-accent/10 hover:text-accent"
                : "bg-accent hover:bg-accent text-white shadow-lg shadow-emerald-900/20"
                } ${className}`}
        >
            {isFollowing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isFollowing ? "Following" : "Follow"}
        </Button>
    );
}
