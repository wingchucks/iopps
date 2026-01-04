"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getPendingConnectionRequests, getSuggestedConnections, respondToConnectionRequest, getSuggestedOrganizations } from "@/lib/firestore/social";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import { FollowButton } from "@/components/social/FollowButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus, Users, Search, Building2 } from "lucide-react";
import { MemberProfile, Connection } from "@/lib/types";
import { Input } from "@/components/ui/input";

export default function NetworkPage() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<Connection[]>([]);
    const [suggestions, setSuggestions] = useState<MemberProfile[]>([]);
    const [orgSuggestions, setOrgSuggestions] = useState<any[]>([]); // Should be Organization type
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        async function loadData() {
            setLoading(true);
            try {
                const [pending, suggested, orgs] = await Promise.all([
                    getPendingConnectionRequests(user!.uid),
                    getSuggestedConnections(user!.uid),
                    getSuggestedOrganizations(5)
                ]);

                setRequests(pending);
                setSuggestions(suggested);
                setOrgSuggestions(orgs);
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
            setRequests(prev => prev.filter(req => req.id !== connectionId));
        } catch (error) {
            console.error("Failed to respond to request", error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20 min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="container max-w-6xl py-8 space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Grow Your Network</h1>
                    <p className="text-slate-400">Find people, companies, and mentors to accelerate your career.</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search for people or companies..."
                        className="pl-10 bg-slate-900/50 border-slate-800 focus-visible:ring-emerald-500/50 rounded-full"
                    />
                </div>
            </div>

            {/* Pending Requests */}
            {requests.length > 0 && (
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 text-amber-500">
                                <UserPlus className="h-4 w-4" />
                            </span>
                            Pending Invitations
                            <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{requests.length}</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {requests.map((request) => (
                            <Card key={request.id} className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <Avatar className="h-12 w-12 border-2 border-slate-800">
                                        <AvatarImage src={request.requesterAvatarUrl} />
                                        <AvatarFallback>{request.requesterName ? request.requesterName[0] : "?"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <h3 className="font-semibold text-slate-200 truncate">{request.requesterName}</h3>
                                        <p className="text-xs text-slate-500 truncate">{request.requesterTagline || "Member"}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-500 h-9 px-4 flex-1"
                                            onClick={() => handleRespond(request.id, 'accepted')}
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-9 px-4 text-slate-400 hover:text-slate-200"
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

            {/* Recommended Organizations */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-500">
                            <Building2 className="h-4 w-4" />
                        </span>
                        Recommended Organizations
                    </h2>
                    <Button variant="ghost" className="text-emerald-500 hover:text-emerald-400 text-sm">View All</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {orgSuggestions.length === 0 ? (
                        // Fallback placeholders if no data
                        Array.from({ length: 5 }).map((_, i) => (
                            <Card key={i} className="bg-slate-900 border-slate-800 flex flex-col items-center p-6 text-center hover:border-slate-700 transition-colors group">
                                <div className="w-16 h-16 rounded-full bg-slate-800 mb-4 group-hover:scale-105 transition-transform" />
                                <div className="h-4 w-24 bg-slate-800 rounded mb-2" />
                                <div className="h-3 w-16 bg-slate-800/50 rounded mb-4" />
                                <div className="h-8 w-full bg-slate-800 rounded" />
                            </Card>
                        ))
                    ) : (
                        orgSuggestions.map((org) => (
                            <Card key={org.id} className="bg-slate-900 border-slate-800 flex flex-col items-center p-6 text-center hover:border-emerald-500/30 transition-all hover:bg-slate-800/50 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <Avatar className="h-16 w-16 mb-3 border-2 border-slate-700 group-hover:border-emerald-500/50 transition-colors shadow-lg">
                                    <AvatarImage src={org.logoUrl} />
                                    <AvatarFallback>{org.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <h3 className="font-semibold text-slate-200 line-clamp-1 w-full mb-1">{org.name}</h3>
                                <p className="text-xs text-slate-500 mb-4 line-clamp-1 w-full">{org.industry || "Organization"}</p>
                                <FollowButton targetOrgId={org.id} className="w-full relative z-10" />
                            </Card>
                        ))
                    )}
                </div>
            </section>

            {/* People You May Know */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500">
                            <Users className="h-4 w-4" />
                        </span>
                        People You May Know
                    </h2>
                    <Button variant="ghost" className="text-emerald-500 hover:text-emerald-400 text-sm">View All</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {suggestions.map((person) => (
                        <Card key={person.id} className="bg-slate-900 border-slate-800 overflow-hidden hover:border-slate-700 transition-all group">
                            {/* Banner */}
                            <div className="h-20 bg-gradient-to-br from-slate-800 to-slate-900 relative">
                                <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
                            </div>

                            <CardContent className="p-4 pt-0 relative">
                                <Avatar className="h-16 w-16 border-4 border-slate-900 absolute -top-8 left-4 shadow-lg">
                                    <AvatarImage src={person.photoURL} />
                                    <AvatarFallback>{person.displayName?.[0]}</AvatarFallback>
                                </Avatar>

                                <div className="mt-10 mb-4 space-y-1">
                                    <h3 className="font-semibold text-slate-200 line-clamp-1 group-hover:text-emerald-400 transition-colors" title={person.displayName}>
                                        {person.displayName}
                                    </h3>
                                    <p className="text-xs text-slate-500 line-clamp-2 min-h-[2.5em]" title={person.tagline}>
                                        {person.tagline || "IOPPS Member"}
                                    </p>
                                    {/* Optional: Mutual connections count */}
                                    <p className="text-[10px] text-slate-600 flex items-center gap-1 mt-1">
                                        <Users className="h-3 w-3" /> 12 mutual connections
                                    </p>
                                </div>

                                <ConnectionButton targetUserId={person.id} className="w-full" />
                            </CardContent>
                        </Card>
                    ))}

                    {suggestions.length === 0 && (
                        <div className="col-span-full p-12 text-center border border-dashed border-slate-800 rounded-lg">
                            <p className="text-slate-500">We're finding the best matches for you...</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
