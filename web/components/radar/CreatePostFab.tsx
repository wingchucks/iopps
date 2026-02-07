"use client";

import { useState } from "react";
import { PlusIcon, PencilSquareIcon, TrophyIcon, QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
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
            delay: 0.1,
        },
        {
            id: "question",
            label: "Ask Question",
            icon: QuestionMarkCircleIcon,
            color: "bg-blue-500",
            delay: 0.05,
        },
        {
            id: "update",
            label: "Share Update",
            icon: PencilSquareIcon,
            color: "bg-accent",
            delay: 0,
        },
    ];

    return (
        <div className="fixed bottom-24 right-5 z-50 sm:bottom-8 sm:right-8">
            {/* Backdrop for mobile focus */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
                    />
                )}
            </AnimatePresence>

            <div className="relative z-50 flex flex-col items-end gap-4">
                <AnimatePresence>
                    {isOpen && (
                        <div className="flex flex-col items-end gap-3 mb-2">
                            {menuItems.map((item) => (
                                <motion.button
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                    transition={{ duration: 0.2, delay: item.delay }}
                                    onClick={() => handleSelect(item.id)}
                                    className="group flex items-center gap-3 pr-1"
                                >
                                    <span className="rounded-lg bg-slate-800/90 px-3 py-1.5 text-sm font-semibold text-white shadow-lg backdrop-blur sm:block">
                                        {item.label}
                                    </span>
                                    <div
                                        className={`${item.color} flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-110`}
                                    >
                                        <item.icon className="h-6 w-6 text-white" />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </AnimatePresence>

                {/* Main Floating Action Button */}
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 ${isOpen ? "bg-slate-700 rotate-45" : "bg-gradient-to-r from-[#14B8A6] to-cyan-500"
                        }`}
                >
                    {isOpen ? (
                        <XMarkIcon className="h-7 w-7 text-white" />
                    ) : (
                        <PlusIcon className="h-7 w-7 text-white" />
                    )}
                </motion.button>
            </div>

            <CelebrateWinModal
                isOpen={activeModal === 'win'}
                onClose={() => setActiveModal(null)}
            />
        </div>
    );
}
