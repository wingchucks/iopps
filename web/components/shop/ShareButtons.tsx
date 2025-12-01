"use client";

import { useState, useCallback } from "react";

interface ShareButtonsProps {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "button";
  platforms?: ("facebook" | "twitter" | "linkedin" | "pinterest" | "email" | "copy")[];
  onShare?: (platform: string) => void;
}

const defaultPlatforms: ShareButtonsProps["platforms"] = [
  "facebook",
  "twitter",
  "linkedin",
  "pinterest",
  "email",
  "copy",
];

/**
 * Social sharing buttons component
 */
export function ShareButtons({
  title,
  description,
  url,
  image,
  size = "md",
  variant = "icon",
  platforms = defaultPlatforms,
  onShare,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  // Get current URL if not provided
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareText = description || title;

  const handleShare = useCallback(
    async (platform: string) => {
      let shareLink = "";

      switch (platform) {
        case "facebook":
          shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
          break;
        case "twitter":
          shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
          break;
        case "linkedin":
          shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
          break;
        case "pinterest":
          shareLink = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareText)}${image ? `&media=${encodeURIComponent(image)}` : ""}`;
          break;
        case "email":
          shareLink = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
          break;
        case "copy":
          try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch (err) {
            console.error("Failed to copy:", err);
          }
          break;
      }

      if (shareLink && platform !== "email") {
        window.open(shareLink, "_blank", "width=600,height=400");
      } else if (platform === "email") {
        window.location.href = shareLink;
      }

      onShare?.(platform);
    },
    [shareUrl, title, shareText, image, onShare]
  );

  const sizeClasses = {
    sm: {
      icon: "p-1.5",
      iconSize: "h-4 w-4",
      button: "px-3 py-1.5 text-xs gap-1.5",
    },
    md: {
      icon: "p-2",
      iconSize: "h-5 w-5",
      button: "px-4 py-2 text-sm gap-2",
    },
    lg: {
      icon: "p-2.5",
      iconSize: "h-6 w-6",
      button: "px-5 py-2.5 text-base gap-2",
    },
  };

  const classes = sizeClasses[size];

  const icons: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    facebook: {
      icon: (
        <svg className={classes.iconSize} fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      label: "Facebook",
      color: "hover:bg-blue-600",
    },
    twitter: {
      icon: (
        <svg className={classes.iconSize} fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      label: "X (Twitter)",
      color: "hover:bg-slate-700",
    },
    linkedin: {
      icon: (
        <svg className={classes.iconSize} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      label: "LinkedIn",
      color: "hover:bg-blue-700",
    },
    pinterest: {
      icon: (
        <svg className={classes.iconSize} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
        </svg>
      ),
      label: "Pinterest",
      color: "hover:bg-red-600",
    },
    email: {
      icon: (
        <svg className={classes.iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      label: "Email",
      color: "hover:bg-slate-600",
    },
    copy: {
      icon: copied ? (
        <svg className={classes.iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className={classes.iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      label: copied ? "Copied!" : "Copy Link",
      color: "hover:bg-slate-600",
    },
  };

  const activePlatforms = platforms ?? defaultPlatforms;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activePlatforms.map((platform) => {
        const { icon, label, color } = icons[platform];

        if (variant === "icon") {
          return (
            <button
              key={platform}
              onClick={() => handleShare(platform)}
              title={label}
              className={`rounded-lg border border-slate-700 ${classes.icon} text-slate-400 transition hover:text-white ${color}`}
            >
              {icon}
            </button>
          );
        }

        return (
          <button
            key={platform}
            onClick={() => handleShare(platform)}
            className={`inline-flex items-center rounded-lg border border-slate-700 ${classes.button} font-medium text-slate-300 transition hover:text-white ${color}`}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Share modal component
 */
export function ShareModal({
  isOpen,
  onClose,
  title,
  description,
  url,
  image,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  url?: string;
  image?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-[#08090C] p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <h2 className="text-lg font-semibold text-slate-100">Share</h2>
        <p className="mt-1 text-sm text-slate-400">
          Share this with your friends and followers
        </p>

        {/* Preview */}
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-start gap-3">
            {image && (
              <img
                src={image}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-200">{title}</p>
              {description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="mt-6">
          <ShareButtons
            title={title}
            description={description}
            url={url}
            image={image}
            variant="button"
            size="md"
          />
        </div>

        {/* Native Share (if available) */}
        {typeof navigator !== "undefined" && navigator.share && (
          <button
            onClick={async () => {
              try {
                await navigator.share({
                  title,
                  text: description,
                  url: url || window.location.href,
                });
                onClose();
              } catch (err) {
                // User cancelled or share failed
              }
            }}
            className="mt-4 w-full rounded-lg bg-[#14B8A6] py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#0D9488]"
          >
            More Options
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline share button that triggers native share or shows modal
 */
export function ShareButton({
  title,
  description,
  url,
  image,
  className = "",
  children,
}: {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = useCallback(async () => {
    // Try native share first
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: url || window.location.href,
        });
        return;
      } catch (err) {
        // User cancelled or share not available, fall through to modal
      }
    }

    // Show modal as fallback
    setIsModalOpen(true);
  }, [title, description, url]);

  return (
    <>
      <button onClick={handleClick} className={className}>
        {children || (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </>
        )}
      </button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
        description={description}
        url={url}
        image={image}
      />
    </>
  );
}
