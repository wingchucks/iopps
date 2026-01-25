"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RadarFeed } from "@/components/radar/RadarFeed";
import CreatePostFab from "@/components/radar/CreatePostFab";

export default function RadarPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) return null;

    return (
        <div className="container max-w-2xl px-0 sm:px-4 pb-24 pt-4">
            {/* Search Header for Mobile */}
            <div className="flex items-center gap-3 px-4 mb-4 sm:hidden">
                <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center text-teal-500 font-bold border border-slate-700">
                    I
                </div>
                <div className="flex-1 h-10 bg-slate-800/50 rounded-full flex items-center px-4 text-slate-500 text-sm border border-slate-700/50">
                    Search opportunities...
                </div>
            </div>

            <RadarFeed />
            <CreatePostFab />
        </div>
    );
}
