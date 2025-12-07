"use client";

import { useState } from "react";
import { type Conference } from "@/lib/types";

interface ConferenceBuilderNavProps {
    activeTab: string;
    onChange: (tab: string) => void;
}

export function ConferenceBuilderNav({ activeTab, onChange }: ConferenceBuilderNavProps) {
    const tabs = [
        { id: "overview", label: "Overview", icon: "📝" },
        { id: "agenda", label: "Agenda", icon: "📅" },
        { id: "speakers", label: "Speakers", icon: "🎤" },
        { id: "sponsors", label: "Sponsors", icon: "🤝" },
        { id: "venue", label: "Venue", icon: "📍" },
        { id: "protocols", label: "Protocols", icon: "🪶" },
        { id: "faq", label: "FAQ", icon: "❓" },
        { id: "settings", label: "Settings", icon: "⚙️" },
    ];

    return (
        <nav className="flex overflow-x-auto border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`group flex min-w-fit items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors hover:text-white ${activeTab === tab.id
                            ? "border-[#14B8A6] text-[#14B8A6]"
                            : "border-transparent text-slate-400 hover:border-slate-600"
                        }`}
                >
                    <span className="text-base">{tab.icon}</span>
                    {tab.label}
                </button>
            ))}
        </nav>
    );
}
