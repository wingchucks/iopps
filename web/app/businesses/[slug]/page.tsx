import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicOrganizationBySlug, getOrganizationBySlug } from '@/lib/firestore/organizations';
import { OrganizationProfileClient } from './OrganizationProfileClient';
import type { OrganizationProfile } from '@/lib/types';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

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

  // Try to get published profile first
  let org = await getPublicOrganizationBySlug(slug);

  // If not found as published, try to get any profile (for preview/owner view)
  if (!org) {
    org = await getOrganizationBySlug(slug);
    if (!org) {
      notFound();
    }
  }

  return <OrganizationProfileClient organization={org} />;
}
