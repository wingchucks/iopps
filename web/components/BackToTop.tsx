"use client";

import { useEffect, useState } from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";

export function BackToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 400);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (!visible) return null;

    return (
        <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#14B8A6] text-white shadow-lg shadow-[#14B8A6]/30 transition-all hover:bg-[#0d9488] hover:shadow-xl hover:shadow-[#14B8A6]/40 hover:scale-110 animate-in fade-in slide-in-from-bottom-4 duration-300 md:bottom-8"
        >
            <ChevronUpIcon className="h-6 w-6" />
        </button>
    );
}
