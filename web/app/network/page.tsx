"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getPendingConnectionRequests, getSuggestedConnections, respondToConnectionRequest } from "@/lib/firestore/social";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus, Users } from "lucide-react";
import { MemberProfile, Connection } from "@/lib/types";

export default function NetworkPage() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<Connection[]>([]);
    const [suggestions, setSuggestions] = useState<MemberProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        async function loadData() {
            setLoading(true);
            try {
                // Fetch pending requests
                const pending = await getPendingConnectionRequests(user!.uid);
                setRequests(pending);

                // Fetch suggestions
                const suggested = await getSuggestedConnections(user!.uid);
                setSuggestions(suggested);
            } catch (error) {
                console.error("Failed to load network data", error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [user]);

    const handleRespond = async (connectionId: string, status: 'accepted' | 'declined') => {
        try {
            await respondToConnectionRequest(connectionId, status);
            // Remove from local state
            setRequests(prev => prev.filter(req => req.id !== connectionId));
            // In a real app, maybe refresh suggestions or connections list
        } catch (error) {
            console.error("Failed to respond to request", error);
        }
    };

    if (!user) {
        return <div className="p-8 text-center">Please log in to manage your network.</div>;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container max-w-5xl py-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">My Network</h1>
                <p className="text-muted-foreground">Manage your connections and grow your professional network.</p>
            </div>

            {/* Pending Requests */}
            {requests.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Invitations ({requests.length})
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {requests.map((request) => (
                            <Card key={request.id}>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={request.requesterAvatarUrl} />
                                        <AvatarFallback>{request.requesterName ? request.requesterName[0] : "?"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <h3 className="font-semibold truncate">{request.requesterName}</h3>
                                        <p className="text-xs text-muted-foreground truncate">{request.requesterTagline || "Member"}</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 h-8"
                                            onClick={() => handleRespond(request.id, 'accepted')}
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8"
                                            onClick={() => handleRespond(request.id, 'declined')}
                                        >
                                            Ignore
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Suggested Connections */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        People you may know
                    </h2>
                </div>

                {suggestions.length === 0 ? (
                    <div className="p-8 text-center border rounded-lg bg-muted/20">
                        <p className="text-muted-foreground">No suggestions available right now.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {suggestions.map((person) => (
                            <Card key={person.id} className="overflow-hidden">
                                <div className="h-20 bg-gradient-to-r from-emerald-500/10 to-teal-500/10" />
                                <CardContent className="p-4 pt-0 relative">
                                    <Avatar className="h-16 w-16 border-4 border-background absolute -top-8 left-4">
                                        <AvatarImage src={person.photoURL} />
                                        <AvatarFallback>{person.displayName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="mt-10 mb-4 space-y-1">
                                        <h3 className="font-semibold line-clamp-1" title={person.displayName}>{person.displayName}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]" title={person.tagline}>
                                            {person.tagline || "IOPPS Member"}
                                        </p>
                                    </div>
                                    <ConnectionButton targetUserId={person.id} className="w-full" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
