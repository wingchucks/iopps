"use client";

import { useState, useRef, useEffect } from "react";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
  variant?: "icon" | "button" | "full";
  className?: string;
}

export function ShareButton({
  url,
  title,
  description = "",
  hashtags = [],
  variant = "button",
  className = "",
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
    : url;

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const hashtagString = hashtags.length > 0 ? hashtags.join(",") : "";

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${hashtagString ? `&hashtags=${hashtagString}` : ""}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: fullUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      setIsOpen(true);
    }
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], "_blank", "width=600,height=400");
    setIsOpen(false);
  };

  // Icon-only variant
  if (variant === "icon") {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 backdrop-blur-sm transition-all hover:bg-[#14B8A6]/20 hover:text-[#14B8A6]"
          aria-label="Share"
        >
          <ShareIcon className="h-5 w-5" />
        </button>
        {isOpen && <ShareDropdown {...{ handleCopyLink, handleShare, copied }} />}
      </div>
    );
  }

  // Full variant with text
  if (variant === "full") {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={handleNativeShare}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-200 backdrop-blur-sm transition-all hover:border-[#14B8A6]/50 hover:bg-[#14B8A6]/10 hover:text-[#14B8A6]"
        >
          <ShareIcon className="h-4 w-4" />
          Share
        </button>
        {isOpen && <ShareDropdown {...{ handleCopyLink, handleShare, copied }} />}
      </div>
    );
  }

  // Default button variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur-sm transition-all hover:bg-[#14B8A6]/20 hover:text-[#14B8A6]"
      >
        <ShareIcon className="h-4 w-4" />
        Share
      </button>
      {isOpen && <ShareDropdown {...{ handleCopyLink, handleShare, copied }} />}
    </div>
  );
}

// Dropdown component
function ShareDropdown({
  handleCopyLink,
  handleShare,
  copied,
}: {
  handleCopyLink: () => void;
  handleShare: (platform: "twitter" | "facebook" | "linkedin" | "email") => void;
  copied: boolean;
}) {
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/95 p-2 shadow-xl shadow-black/30 backdrop-blur-xl">
        <p className="mb-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Share via
        </p>

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-[#14B8A6]/10 hover:text-[#14B8A6]"
        >
          {copied ? (
            <>
              <CheckIcon className="h-5 w-5 text-green-400" />
              <span className="text-green-400">Link copied!</span>
            </>
          ) : (
            <>
              <LinkIcon className="h-5 w-5" />
              <span>Copy link</span>
            </>
          )}
        </button>

        <div className="my-2 border-t border-slate-800" />

        {/* Twitter/X */}
        <button
          onClick={() => handleShare("twitter")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-slate-800"
        >
          <XIcon className="h-5 w-5" />
          <span>X (Twitter)</span>
        </button>

        {/* Facebook */}
        <button
          onClick={() => handleShare("facebook")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-[#1877F2]/10 hover:text-[#1877F2]"
        >
          <FacebookIcon className="h-5 w-5" />
          <span>Facebook</span>
        </button>

        {/* LinkedIn */}
        <button
          onClick={() => handleShare("linkedin")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]"
        >
          <LinkedInIcon className="h-5 w-5" />
          <span>LinkedIn</span>
        </button>

        {/* Email */}
        <button
          onClick={() => handleShare("email")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-orange-500/10 hover:text-orange-400"
        >
          <EmailIcon className="h-5 w-5" />
          <span>Email</span>
        </button>
      </div>
    </div>
  );
}

// Icons
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

// Inline share buttons for a more prominent display
export function ShareButtonsInline({
  url,
  title,
  description = "",
  className = "",
}: Omit<ShareButtonProps, "variant" | "hashtags">) {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
    : url;

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const openShare = (url: string) => {
    window.open(url, "_blank", "width=600,height=400");
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        onClick={handleCopyLink}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
          copied
            ? "bg-green-500/20 text-green-400"
            : "bg-slate-800 text-slate-300 hover:bg-[#14B8A6]/20 hover:text-[#14B8A6]"
        }`}
        title={copied ? "Copied!" : "Copy link"}
      >
        {copied ? <CheckIcon className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
      </button>

      <button
        onClick={() => openShare(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
        title="Share on X"
      >
        <XIcon className="h-5 w-5" />
      </button>

      <button
        onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-all hover:bg-[#1877F2]/20 hover:text-[#1877F2]"
        title="Share on Facebook"
      >
        <FacebookIcon className="h-5 w-5" />
      </button>

      <button
        onClick={() => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-all hover:bg-[#0A66C2]/20 hover:text-[#0A66C2]"
        title="Share on LinkedIn"
      >
        <LinkedInIcon className="h-5 w-5" />
      </button>

      <a
        href={`mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-all hover:bg-orange-500/20 hover:text-orange-400"
        title="Share via Email"
      >
        <EmailIcon className="h-5 w-5" />
      </a>
    </div>
  );
}
