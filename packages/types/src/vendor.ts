/**
 * Vendor and shop types for the IOPPS platform (Shop Indigenous).
 */

import type { FirestoreTimestamp, NorthAmericanRegion } from './common';

// ============================================
// VENDOR STATUS & CATEGORIES
// ============================================

export type VendorStatus = 'draft' | 'pending' | 'active' | 'suspended';

export const VENDOR_CATEGORIES = [
  'Art & Crafts',
  'Jewelry & Accessories',
  'Clothing & Apparel',
  'Food & Beverages',
  'Health & Wellness',
  'Home & Living',
  'Books & Media',
  'Services',
  'Other',
] as const;

export type VendorCategory = typeof VENDOR_CATEGORIES[number];

// ============================================
// VENDOR
// ============================================

export interface Vendor {
  id: string;
  userId: string;

  // Business Info
  businessName: string;
  slug: string;
  tagline?: string;
  description: string;
  category: VendorCategory;

  // Location
  location?: string;
  region: NorthAmericanRegion;
  offersShipping: boolean;
  onlineOnly: boolean;

  // Contact & Links
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;

  // Media
  logoUrl?: string;
  coverImageUrl?: string;
  galleryImages?: string[];
  themeColor?: string;

  // Indigenous Identity
  nation?: string;
  communityStory?: string;

  // Status & Visibility
  status: VendorStatus;
  featured: boolean;
  verified: boolean;

  // Analytics
  viewCount: number;

  // Payment
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'cancelled' | 'past_due';
  subscriptionEndsAt?: FirestoreTimestamp | null;
  // Admin Bypass - Free listing without subscription
  freeListingEnabled?: boolean;
  freeListingReason?: string;
  freeListingGrantedAt?: FirestoreTimestamp | null;
  freeListingGrantedBy?: string;

  // Timestamps
  createdAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp | null;
}

// ============================================
// VENDOR PRODUCT
// ============================================

export interface VendorProduct {
  id: string;
  vendorId: string;

  // Product Info
  name: string;
  description: string;
  category: string;
  price?: number; // In cents
  priceDisplay?: string;

  // Media
  imageUrl?: string;
  images?: string[];

  // Availability
  inStock: boolean;
  madeToOrder: boolean;

  // Display
  featured: boolean;
  sortOrder: number;
  active: boolean;

  // Timestamps
  createdAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp | null;
}

// ============================================
// VENDOR INQUIRY
// ============================================

export interface VendorInquiry {
  id: string;
  vendorId: string;
  productId?: string;

  // Sender info
  senderName: string;
  senderEmail: string;
  senderPhone?: string;

  // Inquiry details
  subject: string;
  message: string;

  // Status
  status: 'new' | 'read' | 'replied' | 'archived';
  repliedAt?: FirestoreTimestamp | null;

  // Timestamps
  createdAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp | null;
}

// ============================================
// SHOP LISTING (Alias)
// ============================================

export type ShopListing = Vendor;

// ============================================
// SERVICE TYPES (Indigenous Marketplace)
// ============================================

export const SERVICE_CATEGORIES = [
  'Consulting',
  'Legal Services',
  'Accounting & Finance',
  'Marketing & Communications',
  'IT & Technology',
  'Design & Creative',
  'Construction & Trades',
  'Health & Wellness',
  'Education & Training',
  'Environmental Services',
  'Cultural Services',
  'Translation & Language',
  'Event Services',
  'Other Professional Services',
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

export type ServiceStatus = 'draft' | 'pending' | 'active' | 'approved' | 'suspended';

export interface Service {
  id: string;
  vendorId: string;
  userId: string;

  // Business Info
  businessName: string;
  slug: string;
  title: string;
  tagline?: string;
  description: string;
  category: ServiceCategory;

  // Location & Availability
  location?: string;
  region: NorthAmericanRegion;
  servesRemote: boolean;
  serviceAreas?: string[];

  // Contact & Links
  useOrgContact?: boolean;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  bookingUrl?: string;

  // Media
  logoUrl?: string;
  coverImageUrl?: string;
  portfolioImages?: string[];

  // Indigenous Identity
  nation?: string;
  indigenousOwned: boolean;
  communityStory?: string;

  // Service Details
  services?: string[];
  industries?: string[];
  certifications?: string[];
  yearsExperience?: number;

  // Pricing
  priceRange?: string;
  freeConsultation?: boolean;

  // Status & Visibility
  status: ServiceStatus;
  featured: boolean;
  verified: boolean;

  // Analytics
  viewCount: number;
  contactClicks: number;

  // Timestamps
  createdAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp | null;
}

// ============================================
// UNIFIED OFFERING (Products & Services)
// ============================================

export type OfferingType = 'product' | 'service';

export interface UnifiedOffering {
  id: string;
  type: OfferingType;
  userId: string;
  vendorId?: string;

  // Common fields
  name: string;
  slug?: string;
  description: string;
  category: string;

  // Pricing
  price?: number;
  priceDisplay?: string;

  // Media
  imageUrl?: string;
  images?: string[];

  // Availability
  active: boolean;
  featured: boolean;

  // Service-specific
  servesRemote?: boolean;
  bookingUrl?: string;

  // Product-specific
  inStock?: boolean;
  madeToOrder?: boolean;

  // Analytics
  viewCount: number;
  contactClicks: number;

  // Timestamps
  createdAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp | null;
}

// ============================================
// OUTBOUND CLICK ANALYTICS
// ============================================

export type OutboundLinkType = 'website' | 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'booking' | 'phone' | 'email' | 'other';

export interface OutboundClickEvent {
  id: string;
  organizationId: string;
  vendorId?: string;
  offeringId?: string;
  linkType: OutboundLinkType;
  targetUrl: string;
  visitorId?: string;
  sessionId?: string;
  referrer?: string;
  createdAt: FirestoreTimestamp | null;
}

export interface ClickStats {
  total: number;
  byLinkType: Record<OutboundLinkType, number>;
  byDay: { date: string; count: number }[];
}

export interface ViewStats {
  total: number;
  byDay: { date: string; count: number }[];
}
