import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Linking, Platform } from 'react-native';
import { Job } from '@/types';
import * as Sentry from '@sentry/react-native';
import { logger } from './logger';

export interface ShareableItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  type: 'job' | 'scholarship' | 'conference';
}

export interface ShareResult {
  success: boolean;
  platform?: string;
  error?: string;
}

/**
 * Generate deep link for a job posting
 */
export function generateDeepLink(itemId: string, type: ShareableItem['type']): string {
  const baseUrl = 'https://iopps.app';
  const paths = {
    job: 'jobs',
    scholarship: 'scholarships',
    conference: 'conferences',
  };

  return `${baseUrl}/${paths[type]}/${itemId}`;
}

/**
 * Generate shareable text for an item
 */
export function generateShareText(item: ShareableItem): string {
  const url = item.url || generateDeepLink(item.id, item.type);
  const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);

  let text = `${typeLabel}: ${item.title}\n\n`;

  if (item.description) {
    const truncatedDesc = item.description.length > 200
      ? item.description.substring(0, 200) + '...'
      : item.description;
    text += `${truncatedDesc}\n\n`;
  }

  text += `View on IOPPS: ${url}`;

  return text;
}

/**
 * Track share events using Sentry breadcrumbs and logger
 */
export function trackShareEvent(
  itemId: string,
  itemType: ShareableItem['type'],
  platform: string
): void {
  const eventData = {
    itemId,
    itemType,
    platform,
    timestamp: new Date().toISOString(),
  };

  // Log in development
  logger.track('share_event', eventData);

  // Add Sentry breadcrumb for debugging share flows
  Sentry.addBreadcrumb({
    category: 'share',
    message: `Shared ${itemType} via ${platform}`,
    level: 'info',
    data: eventData,
  });
}

/**
 * Share a job using the native share sheet
 */
export async function shareJob(job: Job): Promise<ShareResult> {
  try {
    const shareableItem: ShareableItem = {
      id: job.id,
      title: job.title,
      description: job.description,
      type: 'job',
    };

    return await shareItem(shareableItem);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share job',
    };
  }
}

/**
 * Generic share function for any shareable item
 */
export async function shareItem(item: ShareableItem): Promise<ShareResult> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      // Fallback to copying to clipboard
      await copyToClipboard(item);
      return {
        success: true,
        platform: 'clipboard',
      };
    }

    const shareText = generateShareText(item);

    // Create a temporary file or use direct sharing
    await Sharing.shareAsync('data:text/plain;base64,' + btoa(shareText), {
      dialogTitle: `Share ${item.type}`,
    });

    trackShareEvent(item.id, item.type, 'native_share_sheet');

    return {
      success: true,
      platform: 'native_share_sheet',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share',
    };
  }
}

/**
 * Share to Twitter
 */
export async function shareToTwitter(item: ShareableItem): Promise<ShareResult> {
  try {
    const url = item.url || generateDeepLink(item.id, item.type);
    const text = encodeURIComponent(`${item.title} - Check out this ${item.type} on IOPPS!`);
    const shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`;

    const supported = await Linking.canOpenURL(shareUrl);

    if (supported) {
      await Linking.openURL(shareUrl);
      trackShareEvent(item.id, item.type, 'twitter');

      return {
        success: true,
        platform: 'twitter',
      };
    } else {
      throw new Error('Cannot open Twitter');
    }
  } catch (error) {
    return {
      success: false,
      platform: 'twitter',
      error: error instanceof Error ? error.message : 'Failed to share to Twitter',
    };
  }
}

/**
 * Share to LinkedIn
 */
export async function shareToLinkedIn(item: ShareableItem): Promise<ShareResult> {
  try {
    const url = item.url || generateDeepLink(item.id, item.type);
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

    const supported = await Linking.canOpenURL(shareUrl);

    if (supported) {
      await Linking.openURL(shareUrl);
      trackShareEvent(item.id, item.type, 'linkedin');

      return {
        success: true,
        platform: 'linkedin',
      };
    } else {
      throw new Error('Cannot open LinkedIn');
    }
  } catch (error) {
    return {
      success: false,
      platform: 'linkedin',
      error: error instanceof Error ? error.message : 'Failed to share to LinkedIn',
    };
  }
}

/**
 * Share to Facebook
 */
export async function shareToFacebook(item: ShareableItem): Promise<ShareResult> {
  try {
    const url = item.url || generateDeepLink(item.id, item.type);
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

    const supported = await Linking.canOpenURL(shareUrl);

    if (supported) {
      await Linking.openURL(shareUrl);
      trackShareEvent(item.id, item.type, 'facebook');

      return {
        success: true,
        platform: 'facebook',
      };
    } else {
      throw new Error('Cannot open Facebook');
    }
  } catch (error) {
    return {
      success: false,
      platform: 'facebook',
      error: error instanceof Error ? error.message : 'Failed to share to Facebook',
    };
  }
}

/**
 * Copy item link to clipboard
 */
export async function copyToClipboard(item: ShareableItem): Promise<ShareResult> {
  try {
    const url = item.url || generateDeepLink(item.id, item.type);
    await Clipboard.setStringAsync(url);
    trackShareEvent(item.id, item.type, 'clipboard');

    return {
      success: true,
      platform: 'clipboard',
    };
  } catch (error) {
    return {
      success: false,
      platform: 'clipboard',
      error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
    };
  }
}

/**
 * Copy job link to clipboard (convenience function)
 */
export async function copyJobLinkToClipboard(job: Job): Promise<ShareResult> {
  const shareableItem: ShareableItem = {
    id: job.id,
    title: job.title,
    type: 'job',
  };

  return await copyToClipboard(shareableItem);
}

/**
 * Get platform-specific share options
 */
export function getSharePlatforms() {
  return [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'logo-twitter',
      color: '#1DA1F2',
      handler: shareToTwitter,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: 'logo-linkedin',
      color: '#0077B5',
      handler: shareToLinkedIn,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'logo-facebook',
      color: '#1877F2',
      handler: shareToFacebook,
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: 'copy-outline',
      color: '#6B7280',
      handler: copyToClipboard,
    },
  ];
}
