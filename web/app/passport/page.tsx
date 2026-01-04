"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import OverviewTab from "../member/dashboard/OverviewTab";

export default function PassportPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) return null;

    return (
        <div className="container max-w-4xl py-6 pb-24">
            <div className="px-4 mb-6">
                <h1 className="text-2xl font-bold text-white">My Passport</h1>
                <p className="text-slate-400">Your career journey and tools.</p>
            </div>

            {/* Reusing existing Dashboard Logic for MVP */}
            <OverviewTab onNavigate={(tab) => console.log("Navigate to", tab)} />
        </div>
    );
}
