/**
 * Shop Indigenous - Firebase Operations
 * Clean, unified data layer for vendor management
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Vendor, VendorProduct, VendorStatus, VendorCategory, NorthAmericanRegion } from '@/lib/types';

const VENDORS_COLLECTION = 'vendors';
const PRODUCTS_COLLECTION = 'vendorProducts';

// ============================================
// Slug Generation
// ============================================

function generateSlug(businessName: string): string {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

// ============================================
// Vendor CRUD Operations
// ============================================

export async function createVendor(
  userId: string,
  data: Omit<Vendor, 'id' | 'userId' | 'slug' | 'status' | 'featured' | 'verified' | 'viewCount' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');

  const slug = generateSlug(data.businessName);

  const vendor: Omit<Vendor, 'id'> = {
    ...data,
    userId,
    slug,
    status: 'draft',
    featured: false,
    verified: false,
    viewCount: 0,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db, VENDORS_COLLECTION), vendor);
  return docRef.id;
}

export async function getVendor(vendorId: string): Promise<Vendor | null> {
  if (!db) return null;

  const docRef = doc(db, VENDORS_COLLECTION, vendorId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...docSnap.data() } as Vendor;
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  if (!db) return null;

  const q = query(
    collection(db, VENDORS_COLLECTION),
    where('slug', '==', slug),
    where('status', '==', 'active'),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Vendor;
}

/**
 * Get vendor by slug regardless of status (for preview mode)
 * Used when vendor owners want to preview their listing before it's active
 */
export async function getVendorBySlugAnyStatus(slug: string): Promise<Vendor | null> {
  if (!db) return null;

  const q = query(
    collection(db, VENDORS_COLLECTION),
    where('slug', '==', slug),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Vendor;
}

export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  if (!db) return null;

  const q = query(
    collection(db, VENDORS_COLLECTION),
    where('userId', '==', userId),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Vendor;
}

export async function updateVendor(
  vendorId: string,
  data: Partial<Omit<Vendor, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  const docRef = doc(db, VENDORS_COLLECTION, vendorId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteVendor(vendorId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  await deleteDoc(doc(db, VENDORS_COLLECTION, vendorId));
}

// ============================================
// Vendor Listing Queries
// ============================================

export interface VendorFilters {
  category?: VendorCategory;
  region?: NorthAmericanRegion;
  featured?: boolean;
  search?: string;
}

export async function getActiveVendors(filters?: VendorFilters): Promise<Vendor[]> {
  if (!db) return [];

  let q = query(
    collection(db, VENDORS_COLLECTION),
    where('status', '==', 'active')
    // orderBy('featured', 'desc'), // Removed to avoid index requirement
    // orderBy('createdAt', 'desc') // Removed to avoid index requirement
  );

  if (filters?.category) {
    q = query(
      collection(db, VENDORS_COLLECTION),
      where('status', '==', 'active'),
      where('category', '==', filters.category)
    );
  }

  if (filters?.region) {
    q = query(
      collection(db, VENDORS_COLLECTION),
      where('status', '==', 'active'),
      where('region', '==', filters.region)
    );
  }

  const snap = await getDocs(q);
  let vendors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));

  // Client-side search filter (Firestore doesn't support full-text search)
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    vendors = vendors.filter(v =>
      v.businessName.toLowerCase().includes(searchLower) ||
      v.description?.toLowerCase().includes(searchLower) ||
      v.tagline?.toLowerCase().includes(searchLower)
    );
  }

  return vendors;
}

export async function getFeaturedVendors(limitCount = 6): Promise<Vendor[]> {
  if (!db) return [];

  const q = query(
    collection(db, VENDORS_COLLECTION),
    where('status', '==', 'active'),
    where('featured', '==', true),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
}

// ============================================
// Analytics
// ============================================

export async function incrementVendorViews(vendorId: string): Promise<void> {
  if (!db) return;

  const docRef = doc(db, VENDORS_COLLECTION, vendorId);
  await updateDoc(docRef, {
    viewCount: increment(1),
  });
}

// ============================================
// Product CRUD Operations
// ============================================

export async function createProduct(
  vendorId: string,
  data: Omit<VendorProduct, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');

  const product: Omit<VendorProduct, 'id'> = {
    ...data,
    vendorId,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), product);
  return docRef.id;
}

export async function getProduct(productId: string): Promise<VendorProduct | null> {
  if (!db) return null;

  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...docSnap.data() } as VendorProduct;
}

export async function getVendorProducts(vendorId: string): Promise<VendorProduct[]> {
  if (!db) return [];

  try {
    // Simple query without multiple orderBy to avoid index requirements
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('vendorId', '==', vendorId),
      where('active', '==', true)
    );

    const snap = await getDocs(q);
    const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorProduct));

    // Sort client-side
    return products.sort((a, b) => {
      const sortA = a.sortOrder ?? 999;
      const sortB = b.sortOrder ?? 999;
      if (sortA !== sortB) return sortA - sortB;
      // Fall back to createdAt desc
      const timeA = a.createdAt?.toMillis?.() ?? 0;
      const timeB = b.createdAt?.toMillis?.() ?? 0;
      return timeB - timeA;
    });
  } catch (error) {
    // If query fails (e.g., no composite index), return empty array
    return [];
  }
}

export async function updateProduct(
  productId: string,
  data: Partial<Omit<VendorProduct, 'id' | 'vendorId' | 'createdAt'>>
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(productId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
}

// ============================================
// Admin Operations
// ============================================

export async function getAllVendors(status?: VendorStatus): Promise<Vendor[]> {
  if (!db) return [];

  let q = query(
    collection(db, VENDORS_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  if (status) {
    q = query(
      collection(db, VENDORS_COLLECTION),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
}

export async function setVendorStatus(vendorId: string, status: VendorStatus): Promise<void> {
  await updateVendor(vendorId, { status });
}

export async function setVendorFeatured(vendorId: string, featured: boolean): Promise<void> {
  await updateVendor(vendorId, { featured });
}

export async function setVendorVerified(vendorId: string, verified: boolean): Promise<void> {
  await updateVendor(vendorId, { verified });
}

// ============================================
// Auto-Create Vendor for Employer Registration
// ============================================

/**
 * Creates a minimal draft vendor profile for a new employer.
 * Called automatically during employer registration.
 */
export async function createDraftVendorForEmployer(
  userId: string,
  displayName: string,
  email: string
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');

  // Check if vendor already exists for this user
  const existingVendor = await getVendorByUserId(userId);
  if (existingVendor) {
    return existingVendor.id; // Return existing ID, don't create duplicate
  }

  const slug = generateSlug(displayName || 'business');

  const vendor: Omit<Vendor, 'id'> = {
    userId,
    businessName: displayName || '',
    slug,
    description: '',
    category: 'Other' as VendorCategory,
    region: 'Ontario' as NorthAmericanRegion,
    offersShipping: false,
    onlineOnly: false,
    email: email || '',
    status: 'draft',
    featured: false,
    verified: false,
    viewCount: 0,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db, VENDORS_COLLECTION), vendor);
  return docRef.id;
}
