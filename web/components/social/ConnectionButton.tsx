"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, X } from "lucide-react";
import { getConnectionStatus, sendConnectionRequest, respondToConnectionRequest } from "@/lib/firestore/social"; // Assuming these are exported from there
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/use-toast";

interface ConnectionButtonProps {
    targetUserId: string;
    className?: string; // Allow custom styling
}

export function ConnectionButton({ targetUserId, className }: ConnectionButtonProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [status, setStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted'>('none');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !targetUserId) return;

        async function checkStatus() {
            try {
                const result = await getConnectionStatus(user?.uid || '', targetUserId);
                // Force cast as we know our helper returns specific strings for UI state
                setStatus(result as any);
            } catch (error) {
                console.error("Failed to check connection status", error);
            } finally {
                setLoading(false);
            }
        }

        // Don't check status for self
        if (user?.uid === targetUserId) {
            setLoading(false);
            return;
        }

        checkStatus();
    }, [user, targetUserId]);

    const handleConnect = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await sendConnectionRequest(user?.uid || '', targetUserId);
            setStatus('pending_sent');
            toast({ title: "Request sent", description: "Connection request sent." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to send request.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        // For MVP, redirect to network page to handle accept/decline
        window.location.href = "/network";
    };

    if (loading) return <Button disabled size="sm" variant="ghost">Loading...</Button>;

    if (user?.uid === targetUserId) return null;

    if (status === 'accepted') {
        return (
            <Button variant="outline" size="sm" className={`gap-2 text-emerald-600 border-emerald-200 bg-emerald-50 ${className}`}>
                <UserCheck className="h-4 w-4" />
                Connected
            </Button>
        );
    }

    if (status === 'pending_sent') {
        return (
            <Button variant="outline" size="sm" disabled className={`gap-2 ${className}`}>
                <Clock className="h-4 w-4" />
                Pending
            </Button>
        );
    }

    if (status === 'pending_received') {
        return (
            <Button variant="primary" size="sm" onClick={handleAccept} className={`gap-2 bg-emerald-600 hover:bg-emerald-700 ${className}`}>
                <UserPlus className="h-4 w-4" />
                Respond
            </Button>
        );
    }

    return (
        <Button size="sm" onClick={handleConnect} className={`gap-2 bg-slate-900 text-white hover:bg-slate-800 ${className}`}>
            <UserPlus className="h-4 w-4" />
            Connect
        </Button>
    );
}
