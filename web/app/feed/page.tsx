"use client";

import { Feed } from "@/components/social/Feed";
import { useAuth } from "@/components/AuthProvider";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import OceanWaveHero from "@/components/OceanWaveHero";

export default function FeedPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login?redirect=/feed");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!user) {
        return null; // Redirecting
    }

    return (
        <div className="min-h-screen bg-slate-950 pb-20">
            {/* Minimal Hero for Social Page */}
            <div className="relative overflow-hidden bg-slate-900 pb-8 pt-24 text-center shadow-md">
                <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-5"></div>
                <div className="relative z-10 px-4">
                    <h1 className="text-3xl font-bold text-white mb-2">Community Feed</h1>
                    <p className="text-slate-400 max-w-lg mx-auto text-sm">
                        Connect with professionals, find opportunities, and celebrate culture.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Sidebar - Profile & Nav */}
                    <div className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-24 space-y-4">
                            <div className="rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm text-center">
                                <div className="mx-auto h-20 w-20 rounded-full bg-slate-800 overflow-hidden mb-3 border-2 border-emerald-500/50">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName || "User"} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-slate-500">
                                            {user.displayName?.[0] || "U"}
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg">{user.displayName || "Community Member"}</h3>
                                <p className="text-sm text-muted-foreground mb-4">Software Developer</p>
                                <div className="flex justify-around text-center text-sm border-t border-border/50 pt-3">
                                    <div>
                                        <div className="font-bold">0</div>
                                        <div className="text-xs text-muted-foreground">Followers</div>
                                    </div>
                                    <div>
                                        <div className="font-bold">0</div>
                                        <div className="text-xs text-muted-foreground">Following</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Feed */}
                    <div className="lg:col-span-6">
                        <Feed />
                    </div>

                    {/* Right Sidebar - Trending / Suggestions */}
                    <div className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-24 space-y-4">
                            <div className="rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
                                <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Trending Topics</h3>
                                <ul className="space-y-3 text-sm">
                                    <li>
                                        <a href="#" className="flex flex-col hover:bg-white/5 p-2 rounded transition">
                                            <span className="font-semibold text-emerald-400">#Indigenomics</span>
                                            <span className="text-xs text-muted-foreground">Business • 2.4k posts</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="flex flex-col hover:bg-white/5 p-2 rounded transition">
                                            <span className="font-semibold text-emerald-400">#Scholarships2026</span>
                                            <span className="text-xs text-muted-foreground">Education • 850 posts</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="flex flex-col hover:bg-white/5 p-2 rounded transition">
                                            <span className="font-semibold text-emerald-400">#PowWowSeason</span>
                                            <span className="text-xs text-muted-foreground">Community • 5k posts</span>
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
