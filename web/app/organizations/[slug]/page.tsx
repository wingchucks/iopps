import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicOrganizationBySlug, getOrganizationBySlug, isOrganizationDeleted } from '@/lib/firestore/organizations';
import { OrganizationProfileClient } from './OrganizationProfileClient';

// Disable caching for this page so profile updates show immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Try public profile first, then fall back to any accessible profile
  let org = await getPublicOrganizationBySlug(slug);

  if (!org) {
    try {
      org = await getOrganizationBySlug(slug);
    } catch {
      // Permission denied - return generic metadata
      return {
        title: 'Organization Profile | IOPPS',
      };
    }
  }

  if (!org) {
    return {
      title: 'Organization Not Found | IOPPS',
    };
  }

  const description = org.tagline || org.description?.substring(0, 160) || `Discover ${org.organizationName} on IOPPS.`;

  return {
    title: `${org.organizationName} | IOPPS`,
    description,
    openGraph: {
      title: org.organizationName,
      description,
      type: 'profile',
      images: org.logoUrl ? [{ url: org.logoUrl }] : undefined,
    },
  };
}

export default async function OrganizationProfilePage({ params }: Props) {
  const { slug } = await params;

  // Handle invalid slugs
  if (!slug || slug === 'undefined' || slug === 'null') {
    notFound();
  }

  console.log(`[BusinessProfile] Loading profile for slug: "${slug}"`);

  // Try to get published profile first
  let org = await getPublicOrganizationBySlug(slug);

  if (org) {
    console.log(`[BusinessProfile] Found public profile:`, {
      id: org.id,
      organizationName: org.organizationName,
      slug: org.slug,
    });
  }

  // If not found as published, try to get any profile (for preview/owner view)
  // This will only succeed if the user is the owner or an admin (per Firestore rules)
  if (!org) {
    try {
      org = await getOrganizationBySlug(slug);
    } catch (error) {
      // Check if this is a Firestore permission error
      const isPermissionError =
        error instanceof Error &&
        (error.message?.includes('permission') ||
         error.message?.includes('Missing or insufficient') ||
         (error as { code?: string }).code === 'permission-denied');

      if (isPermissionError) {
        // Profile exists but user can't access it (not approved/published)
        const permissionError = new Error(
          'PermissionDenied: This profile is not publicly available'
        );
        permissionError.name = 'PermissionError';
        throw permissionError;
      }

      // For other errors (network issues, etc.), log and show generic error
      console.error('[BusinessProfile] Error fetching profile:', error);
      throw error;
    }

    if (!org) {
      // Document truly doesn't exist
      notFound();
    }
  }

  // Check if organization has been deleted
  if (isOrganizationDeleted(org)) {
    const deletedError = new Error('This business is no longer available');
    deletedError.name = 'DeletedError';
    throw deletedError;
  }

  return <OrganizationProfileClient organization={org} />;
}
