"use client";

import { useState } from "react";

export function BetaBanner() {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    return (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-bold text-amber-500 relative z-[60]">
            <span className="mr-2">🚧</span>
            IOPPS BETA PREVIEW: You are in the Staging Environment. Data here does not affect the live site.
            <button
                onClick={() => setVisible(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-amber-500/20 rounded"
            >
                ✕
            </button>
        </div>
    );
}
