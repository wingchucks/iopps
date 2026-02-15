'use client';

import { useCallback } from 'react';
import type { OutboundLinkType } from '@/lib/types';

interface TrackedLinkProps {
  href: string;
  linkType: OutboundLinkType;
  organizationId: string;
  vendorId?: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

/**
 * TrackedLink component that tracks outbound clicks before navigation.
 * Used on public vendor/organization profiles to measure engagement.
 */
export function TrackedLink({
  href,
  linkType,
  organizationId,
  vendorId,
  children,
  className,
  target = '_blank',
  rel = 'noopener noreferrer',
}: TrackedLinkProps) {
  const handleClick = useCallback(async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Don't block navigation - fire and forget
    try {
      // Use sendBeacon for better reliability (doesn't block navigation)
      const data = JSON.stringify({
        organizationId,
        vendorId,
        linkType,
        targetUrl: href,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track/outbound', data);
      } else {
        // Fallback to fetch for older browsers
        fetch('/api/track/outbound', {
          method: 'POST',
          body: data,
          headers: {
            'Content-Type': 'application/json',
          },
          keepalive: true,
        }).catch(() => {
          // Silently fail - tracking shouldn't break UX
        });
      }
    } catch {
      // Silently fail - tracking shouldn't break UX
    }
  }, [organizationId, vendorId, linkType, href]);

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      target={target}
      rel={rel}
    >
      {children}
    </a>
  );
}

/**
 * Helper function to determine link type from URL
 */
export function getLinkTypeFromUrl(url: string): OutboundLinkType {
  const lowercaseUrl = url.toLowerCase();

  if (lowercaseUrl.includes('instagram.com')) return 'instagram';
  if (lowercaseUrl.includes('facebook.com') || lowercaseUrl.includes('fb.com')) return 'facebook';
  if (lowercaseUrl.includes('tiktok.com')) return 'tiktok';
  if (lowercaseUrl.includes('linkedin.com')) return 'linkedin';
  if (lowercaseUrl.startsWith('tel:')) return 'phone';
  if (lowercaseUrl.startsWith('mailto:')) return 'email';
  if (lowercaseUrl.includes('calendly.com') || lowercaseUrl.includes('booking')) return 'booking';

  return 'website';
}
