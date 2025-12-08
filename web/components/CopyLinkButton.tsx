"use client";

import { useState } from "react";
import { LinkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

interface CopyLinkButtonProps {
    url?: string;
    className?: string;
}

export function CopyLinkButton({ url, className = "" }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const linkToCopy = url || window.location.href;

        try {
            await navigator.clipboard.writeText(linkToCopy);
            setCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = linkToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            toast.success("Link copied!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white ${className}`}
        >
            {copied ? (
                <>
                    <CheckIcon className="h-4 w-4 text-emerald-400" />
                    Copied!
                </>
            ) : (
                <>
                    <LinkIcon className="h-4 w-4" />
                    Copy Link
                </>
            )}
        </button>
    );
}
