'use client';

import React, { useState } from 'react';

export interface ShareItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  image?: string;
  type?: 'job' | 'scholarship' | 'conference' | 'training' | 'grant' | 'event' | 'program';
}

export interface ShareButtonsProps {
  item: ShareItem;
  className?: string;
  showLabels?: boolean;
  variant?: 'horizontal' | 'vertical';
  onShare?: (platform: string) => void;
}

export interface OpenGraphMeta {
  title: string;
  description?: string;
  url: string;
  image?: string;
  type?: string;
  siteName?: string;
}

/**
 * Generate Open Graph meta tags helper
 */
export function generateOpenGraphMeta(meta: OpenGraphMeta): Record<string, string> {
  return {
    'og:title': meta.title,
    'og:description': meta.description || '',
    'og:url': meta.url,
    'og:image': meta.image || '',
    'og:type': meta.type || 'website',
    'og:site_name': meta.siteName || 'IOPPS',
    'twitter:card': 'summary_large_image',
    'twitter:title': meta.title,
    'twitter:description': meta.description || '',
    'twitter:image': meta.image || '',
  };
}

/**
 * Track share events via analytics
 */
function trackShareEvent(itemId: string, platform: string): void {
  // Track via Google Analytics if available
  if (typeof window !== 'undefined') {
    // Google Analytics 4
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'share', {
        method: platform,
        content_type: 'item',
        item_id: itemId,
      });
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] Share event: ${platform} for item ${itemId}`);
    }
  }
}

/**
 * Web Social Share Buttons Component
 */
export default function ShareButtons({
  item,
  className = '',
  showLabels = false,
  variant = 'horizontal',
  onShare,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [webShareSupported] = useState(() =>
    typeof navigator !== 'undefined' && 'share' in navigator
  );

  const shareUrl = item.url || `https://iopps.app/${item.type || 'jobs'}/${item.id}`;

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`${item.title} - Check this out on IOPPS!`);
    const url = encodeURIComponent(shareUrl);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;

    window.open(twitterUrl, '_blank', 'width=550,height=420');
    trackShareEvent(item.id, 'twitter');
    onShare?.('twitter');
  };

  const handleLinkedInShare = () => {
    const url = encodeURIComponent(shareUrl);
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;

    window.open(linkedInUrl, '_blank', 'width=550,height=420');
    trackShareEvent(item.id, 'linkedin');
    onShare?.('linkedin');
  };

  const handleFacebookShare = () => {
    const url = encodeURIComponent(shareUrl);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;

    window.open(facebookUrl, '_blank', 'width=550,height=420');
    trackShareEvent(item.id, 'facebook');
    onShare?.('facebook');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out: ${item.title}`);
    const body = encodeURIComponent(
      `I thought you might be interested in this:\n\n${item.title}\n\n${item.description || ''
      }\n\nView on IOPPS: ${shareUrl}`
    );
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

    window.location.href = mailtoUrl;
    trackShareEvent(item.id, 'email');
    onShare?.('email');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      trackShareEvent(item.id, 'copy');
      onShare?.('copy');

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleWebShare = async () => {
    if (!webShareSupported) return;

    try {
      await navigator.share({
        title: item.title,
        text: item.description,
        url: shareUrl,
      });

      trackShareEvent(item.id, 'web_share_api');
      onShare?.('web_share_api');
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name !== 'AbortError') {
        console.error('Web Share API error:', error);
      }
    }
  };

  const shareButtons = [
    {
      name: 'Twitter',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      onClick: handleTwitterShare,
      color: 'hover:bg-[#1DA1F2] hover:text-white',
      label: 'Twitter',
    },
    {
      name: 'LinkedIn',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      onClick: handleLinkedInShare,
      color: 'hover:bg-[#0077B5] hover:text-white',
      label: 'LinkedIn',
    },
    {
      name: 'Facebook',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      onClick: handleFacebookShare,
      color: 'hover:bg-[#1877F2] hover:text-white',
      label: 'Facebook',
    },
    {
      name: 'Email',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      onClick: handleEmailShare,
      color: 'hover:bg-accent hover:text-white',
      label: 'Email',
    },
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      onClick: () => {
        const text = encodeURIComponent(`Check out: ${item.title}\n${shareUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        trackShareEvent(item.id, 'whatsapp');
        onShare?.('whatsapp');
      },
      color: 'hover:bg-[#25D366] hover:text-white',
      label: 'WhatsApp',
    },
  ];

  return (
    <div className={`share-buttons ${className}`}>
      <div
        className={`flex ${variant === 'vertical' ? 'flex-col' : 'flex-row'
          } gap-2`}
      >
        {/* Web Share API Button (Mobile) */}
        {webShareSupported && (
          <button
            onClick={handleWebShare}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-accent border border-accent hover:bg-accent hover:text-white transition-all duration-200"
            title="Share"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {showLabels && <span className="font-medium">Share</span>}
          </button>
        )}

        {/* Platform-specific Share Buttons */}
        {shareButtons.map((button) => (
          <button
            key={button.name}
            onClick={button.onClick}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white border border-gray-700 transition-all duration-200 ${button.color}`}
            title={button.label}
          >
            {button.icon}
            {showLabels && <span className="font-medium">{button.label}</span>}
          </button>
        ))}

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${copied
              ? 'bg-accent text-white border-accent'
              : 'bg-slate-900 text-accent border-gray-700 hover:bg-accent hover:text-white'
            } border`}
          title={copied ? 'Copied!' : 'Copy Link'}
        >
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {showLabels && <span className="font-medium">Copied!</span>}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {showLabels && <span className="font-medium">Copy Link</span>}
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .share-buttons {
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>
    </div>
  );
}
