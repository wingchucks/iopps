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
            aria-label={copied ? "Link copied to clipboard" : "Copy link to clipboard"}
            className={`flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--card-border)] hover:bg-surface hover:text-white ${className}`}
        >
            {copied ? (
                <>
                    <CheckIcon className="h-4 w-4 text-accent" />
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
