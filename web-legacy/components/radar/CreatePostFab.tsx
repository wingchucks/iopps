"use client";

import { useState } from "react";
import { PlusIcon, PencilSquareIcon, TrophyIcon, QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import CelebrateWinModal from "./CelebrateWinModal";

export default function CreatePostFab() {
    // State for the FAB menu (open/closed)
    const [isOpen, setIsOpen] = useState(false);

    // State for which modal is active
    const [activeModal, setActiveModal] = useState<string | null>(null);

    const handleSelect = (id: string) => {
        setIsOpen(false);
        setActiveModal(id);
    };

    // Menu items with their specific styling/icons
    const menuItems = [
        {
            id: "win",
            label: "Celebrate Win",
            icon: TrophyIcon,
            color: "bg-amber-500",
            delayMs: 100,
        },
        {
            id: "question",
            label: "Ask Question",
            icon: QuestionMarkCircleIcon,
            color: "bg-blue-500",
            delayMs: 50,
        },
        {
            id: "update",
            label: "Share Update",
            icon: PencilSquareIcon,
            color: "bg-accent",
            delayMs: 0,
        },
    ];

    return (
        <div className="fixed bottom-24 right-5 z-50 sm:bottom-8 sm:right-8">
            {/* Backdrop for mobile focus */}
            <div
                onClick={() => setIsOpen(false)}
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-200 ${
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                aria-hidden={!isOpen}
            />

            <div className="relative z-50 flex flex-col items-end gap-4">
                <div
                    className={`flex flex-col items-end gap-3 mb-2 transition-all duration-200 ${
                        isOpen ? "visible" : "invisible"
                    }`}
                >
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            className={`group flex items-center gap-3 pr-1 transition-all duration-200 ${
                                isOpen
                                    ? "opacity-100 translate-y-0 scale-100"
                                    : "opacity-0 translate-y-5 scale-[0.8]"
                            }`}
                            style={{
                                transitionDelay: isOpen ? `${item.delayMs}ms` : "0ms",
                            }}
                            tabIndex={isOpen ? 0 : -1}
                        >
                            <span className="rounded-lg bg-slate-800/90 px-3 py-1.5 text-sm font-semibold text-white shadow-lg backdrop-blur sm:block">
                                {item.label}
                            </span>
                            <div
                                className={`${item.color} flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-110`}
                            >
                                <item.icon className="h-6 w-6 text-white" />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Main Floating Action Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 active:scale-90 ${
                        isOpen ? "bg-slate-700 rotate-45" : "bg-gradient-to-r from-[#14B8A6] to-cyan-500"
                    }`}
                >
                    {isOpen ? (
                        <XMarkIcon className="h-7 w-7 text-white" />
                    ) : (
                        <PlusIcon className="h-7 w-7 text-white" />
                    )}
                </button>
            </div>

            <CelebrateWinModal
                isOpen={activeModal === 'win'}
                onClose={() => setActiveModal(null)}
            />
        </div>
    );
}
