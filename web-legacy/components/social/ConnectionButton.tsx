/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, X } from "lucide-react";
import { getConnectionStatus, sendConnectionRequest, respondToConnectionRequest } from "@/lib/firestore/social";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/use-toast";

interface ConnectionButtonProps {
    targetUserId: string;
    className?: string;
}

export function ConnectionButton({ targetUserId, className }: ConnectionButtonProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [status, setStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted'>('none');
    const [loading, setLoading] = useState(true);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!user || !targetUserId) return;

        async function checkStatus() {
            try {
                const result = await getConnectionStatus(user?.uid || '', targetUserId);
                setStatus(result as any);
            } catch (error) {
                console.error("Failed to check connection status", error);
            } finally {
                setLoading(false);
            }
        }

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
            await sendConnectionRequest(user.uid, targetUserId, message.trim() || undefined);
            setStatus('pending_sent');
            setShowMessageModal(false);
            setMessage("");
            toast({ title: "Request sent", description: "Connection request sent." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to send request.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        window.location.href = "/network";
    };

    if (loading) return <Button disabled size="sm" variant="ghost">Loading...</Button>;

    if (user?.uid === targetUserId) return null;

    if (status === 'accepted') {
        return (
            <Button variant="outline" size="sm" className={`gap-2 text-accent border-emerald-200 bg-[var(--accent-bg)] ${className}`}>
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
            <Button variant="primary" size="sm" onClick={handleAccept} className={`gap-2 bg-accent hover:bg-emerald-700 ${className}`}>
                <UserPlus className="h-4 w-4" />
                Respond
            </Button>
        );
    }

    return (
        <>
            <Button size="sm" onClick={() => setShowMessageModal(true)} className={`gap-2 bg-surface text-white hover:bg-surface ${className}`}>
                <UserPlus className="h-4 w-4" />
                Connect
            </Button>

            {showMessageModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setShowMessageModal(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-surface p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-foreground">Send Connection Request</h2>
                            <button
                                onClick={() => setShowMessageModal(false)}
                                className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-surface hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Add a message (optional)
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                    placeholder="Introduce yourself or say why you'd like to connect..."
                                    className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-accent focus:outline-none resize-none"
                                    maxLength={300}
                                />
                                <p className="mt-1 text-xs text-foreground0 text-right">
                                    {message.length}/300
                                </p>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowMessageModal(false)}
                                    className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConnect}
                                    disabled={loading}
                                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent transition-colors disabled:opacity-50"
                                >
                                    {loading ? "Sending..." : "Send Request"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
