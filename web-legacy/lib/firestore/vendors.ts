/* eslint-disable @typescript-eslint/no-explicit-any */
// Vendor-related Firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  db,
  vendorsCollection,
  shopCollection,
  productServiceListingsCollection,
  checkFirebase,
} from "./shared";
import type { Vendor, VendorStatus, VendorProduct } from "@/lib/types";
import { MOCK_EMPLOYERS } from "../mockData";

// Type aliases for backwards compatibility
type VendorProfile = Vendor;
type VendorApprovalStatus = VendorStatus;
type ShopListing = Vendor;
type ProductServiceListing = VendorProduct;

// Form input type that accepts both old and new field names
type VendorFormInput = Partial<Vendor> & {
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  about?: string;
  heroImageUrl?: string;
  otherLink?: string;
  ownerUserId?: string;
  profileViews?: number;
  websiteClicks?: number;
  favorites?: number;
  followers?: number;
  name?: string;
  owner?: string;
  tags?: string[];
};

// Extended type for data stored in Firestore
type VendorStoredData = Vendor & {
  ownerUserId?: string;
  profileViews?: number;
  websiteClicks?: number;
  favorites?: number;
  followers?: number;
  name?: string;
  owner?: string;
  tags?: string[];
};

// Helper functions
function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(inc|llc|ltd|corp|company|co|limited)\b\.?/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateUniqueSlug(businessName: string): string {
  const baseSlug = slugify(businessName);
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${uniqueSuffix}`;
}

export async function checkForDuplicateVendor(
  userId: string,
  businessName: string,
  websiteUrl?: string,
  contactEmail?: string,
  contactPhone?: string
): Promise<{ isDuplicate: boolean; flags: string[]; matchingVendors: string[] }> {
  checkFirebase();

  const flags: string[] = [];
  const matchingVendors: string[] = [];

  const vendorsRef = collection(db!, vendorsCollection);
  const activeVendorsQuery = query(vendorsRef, where('active', '==', true));
  const vendorsSnap = await getDocs(activeVendorsQuery);

  const normalizedNewName = normalizeBusinessName(businessName);
  const normalizedNewUrl = websiteUrl ? normalizeUrl(websiteUrl) : null;
  const normalizedNewEmail = contactEmail?.toLowerCase().trim();
  const normalizedNewPhone = contactPhone?.replace(/\D/g, '');

  vendorsSnap.forEach((vendorDoc) => {
    const vendor = vendorDoc.data() as VendorProfile;

    if (vendorDoc.id === userId) return;
    if (vendor.status === 'suspended') return;

    if (vendor.businessName) {
      const normalizedExistingName = normalizeBusinessName(vendor.businessName);
      if (normalizedNewName === normalizedExistingName) {
        flags.push('exact_business_name_match');
        matchingVendors.push(vendorDoc.id);
      } else if (
        normalizedNewName.includes(normalizedExistingName) ||
        normalizedExistingName.includes(normalizedNewName)
      ) {
        if (normalizedNewName.length > 3 && normalizedExistingName.length > 3) {
          flags.push('similar_business_name');
          matchingVendors.push(vendorDoc.id);
        }
      }
    }

    if (normalizedNewUrl && vendor.website) {
      const normalizedExistingUrl = normalizeUrl(vendor.website);
      if (normalizedNewUrl === normalizedExistingUrl) {
        flags.push('same_website');
        if (!matchingVendors.includes(vendorDoc.id)) {
          matchingVendors.push(vendorDoc.id);
        }
      }
    }

    if (normalizedNewEmail && vendor.email) {
      if (normalizedNewEmail === vendor.email.toLowerCase().trim()) {
        flags.push('same_contact_email');
        if (!matchingVendors.includes(vendorDoc.id)) {
          matchingVendors.push(vendorDoc.id);
        }
      }
    }

    if (normalizedNewPhone && normalizedNewPhone.length >= 10 && vendor.phone) {
      const normalizedExistingPhone = vendor.phone.replace(/\D/g, '');
      if (normalizedNewPhone === normalizedExistingPhone) {
        flags.push('same_phone_number');
        if (!matchingVendors.includes(vendorDoc.id)) {
          matchingVendors.push(vendorDoc.id);
        }
      }
    }
  });

  const uniqueFlags = [...new Set(flags)];

  return {
    isDuplicate: uniqueFlags.length > 0,
    flags: uniqueFlags,
    matchingVendors: [...new Set(matchingVendors)],
  };
}

export async function getVendorProfile(
  userId: string
): Promise<VendorProfile | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return MOCK_EMPLOYERS.find(e => e.userId === userId || e.id === userId) as unknown as VendorProfile || null;
    }
    const ref = doc(firestore, vendorsCollection, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as any;
      if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();
      if (data.updatedAt?.toDate) data.updatedAt = data.updatedAt.toDate();
      if (data.approvedAt?.toDate) data.approvedAt = data.approvedAt.toDate();

      return { id: snap.id, ...data } as VendorProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getVendorProfileById(
  vendorId: string
): Promise<VendorProfile | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return null;
    }
    const ref = doc(firestore, vendorsCollection, vendorId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as any;
      if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();
      if (data.updatedAt?.toDate) data.updatedAt = data.updatedAt.toDate();
      if (data.approvedAt?.toDate) data.approvedAt = data.approvedAt.toDate();

      return { id: snap.id, ...data } as VendorProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export type UpsertVendorResult = {
  success: boolean;
  status: VendorApprovalStatus;
  duplicateFlags?: string[];
  message?: string;
};

export async function upsertVendorProfile(
  userId: string,
  data: VendorFormInput
): Promise<UpsertVendorResult> {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, userId);
  const snap = await getDoc(ref);

  const timestamp = serverTimestamp();

  let vendorStatus: VendorApprovalStatus = 'active';
  let duplicateFlags: string[] = [];

  if (data.businessName) {
    const duplicateCheck = await checkForDuplicateVendor(
      userId,
      data.businessName,
      data.websiteUrl,
      data.contactEmail,
      data.contactPhone
    );

    if (duplicateCheck.isDuplicate) {
      vendorStatus = 'pending';
      duplicateFlags = duplicateCheck.flags;
    }
  }

  if (snap.exists()) {
    const existingData = snap.data() as VendorStoredData;
    const businessNameChanged = data.businessName &&
      normalizeBusinessName(data.businessName) !== normalizeBusinessName(existingData.businessName || '');

    if (businessNameChanged && data.businessName) {
      const duplicateCheck = await checkForDuplicateVendor(
        userId,
        data.businessName,
        data.websiteUrl || existingData.website,
        data.contactEmail || existingData.email,
        data.contactPhone || existingData.phone
      );

      if (duplicateCheck.isDuplicate) {
        vendorStatus = 'pending';
        duplicateFlags = duplicateCheck.flags;
      } else {
        vendorStatus = existingData.status === 'suspended' ? 'suspended' : 'active';
      }
    } else {
      vendorStatus = existingData.status || 'active';
    }

    const updateData: Record<string, any> = {
      ...data,
      status: vendorStatus,
      duplicateFlags: duplicateFlags.length > 0 ? duplicateFlags : null,
      updatedAt: timestamp,
    };

    if (!existingData.ownerUserId) {
      updateData.ownerUserId = userId;
    }

    const businessNameForSlug = data.businessName || existingData.businessName;
    if ((!existingData.slug || existingData.slug === '') && businessNameForSlug) {
      updateData.slug = generateUniqueSlug(businessNameForSlug);
    }

    if (vendorStatus === 'active') {
      updateData.verificationStatus = 'verified';
    } else if (vendorStatus === 'pending') {
      updateData.verificationStatus = 'pending';
    } else if (vendorStatus === 'suspended') {
      updateData.verificationStatus = 'rejected';
    }

    if (data.contactEmail) updateData.email = data.contactEmail;
    if (data.contactPhone) updateData.phone = data.contactPhone;
    if (data.websiteUrl) updateData.website = data.websiteUrl;
    if (data.about) updateData.description = data.about;
    if (data.heroImageUrl) updateData.coverImage = data.heroImageUrl;
    if (data.logoUrl) updateData.profileImage = data.logoUrl;
    if (data.tagline) updateData.tagline = data.tagline;

    if (data.category) {
      updateData.categories = [data.category];
      updateData.categoryIds = [data.category.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')];
    }

    if (data.location || data.region) {
      const existingDoc = existingData as Record<string, any>;
      const existingLocation = existingDoc.location || {};
      updateData.location = {
        ...existingLocation,
        city: data.location || existingLocation.city || '',
        province: existingLocation.province || '',
        country: existingLocation.country || 'Canada',
        region: data.region || existingLocation.region || '',
      };
    }

    const hasSocialLinks = data.instagram || data.facebook || data.tiktok || data.otherLink;
    if (hasSocialLinks) {
      const existingDoc = existingData as Record<string, any>;
      const existingSocialLinks = existingDoc.socialLinks || {};
      updateData.socialLinks = {
        instagram: data.instagram || existingSocialLinks.instagram || '',
        facebook: data.facebook || existingSocialLinks.facebook || '',
        tiktok: data.tiktok || existingSocialLinks.tiktok || '',
        pinterest: existingSocialLinks.pinterest || '',
        youtube: existingSocialLinks.youtube || '',
      };
    }

    updateData.userId = userId;

    if (existingData.profileViews === undefined) updateData.profileViews = 0;
    if (existingData.websiteClicks === undefined) updateData.websiteClicks = 0;
    if (existingData.favorites === undefined) updateData.favorites = 0;
    if (existingData.followers === undefined) updateData.followers = 0;

    await updateDoc(ref, updateData);
  } else {
    const slug = data.businessName ? generateUniqueSlug(data.businessName) : '';

    const statusValue = vendorStatus === 'active' ? 'active' : 'draft';
    const verificationStatus = vendorStatus === 'active' ? 'verified' : 'pending';

    const categories = data.category ? [data.category] : [];
    const categoryIds = data.category
      ? [data.category.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')]
      : [];

    const locationObj = {
      city: data.location || '',
      province: '',
      country: 'Canada',
      region: data.region || '',
    };

    const socialLinks = {
      instagram: data.instagram || '',
      facebook: data.facebook || '',
      tiktok: data.tiktok || '',
      pinterest: '',
      youtube: '',
    };

    await setDoc(ref, {
      id: userId,
      ownerUserId: userId,
      userId,
      slug,
      status: statusValue,
      verificationStatus,
      ...data,
      email: data.contactEmail || '',
      phone: data.contactPhone || '',
      website: data.websiteUrl || '',
      description: data.about || '',
      coverImage: data.heroImageUrl || '',
      profileImage: data.logoUrl || '',
      categories,
      categoryIds,
      location: locationObj,
      socialLinks,
      profileViews: 0,
      websiteClicks: 0,
      favorites: 0,
      followers: 0,
      duplicateFlags: duplicateFlags.length > 0 ? duplicateFlags : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return {
    success: true,
    status: vendorStatus,
    duplicateFlags: duplicateFlags.length > 0 ? duplicateFlags : undefined,
    message: vendorStatus === 'pending'
      ? 'Your vendor profile has been submitted for review due to potential duplicate detection.'
      : undefined,
  };
}

export async function deleteVendorProfile(vendorId: string): Promise<void> {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  await deleteDoc(ref);
}

export async function updateVendorShopStatus(
  vendorId: string,
  userId: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { success: false, error: 'Vendor profile not found' };
  }

  const existingData = snap.data() as VendorStoredData;

  if (existingData.ownerUserId !== userId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (isPublished) {
    if (!existingData.businessName || !existingData.slug) {
      return { success: false, error: 'Please complete your business name before publishing' };
    }

    if (existingData.status === 'suspended') {
      return { success: false, error: 'Your profile was not approved. Please contact support.' };
    }

    if (existingData.status === 'pending') {
      return { success: false, error: 'Your profile is pending review and will be published once approved.' };
    }
  }

  await updateDoc(ref, {
    status: isPublished ? 'active' : 'draft',
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

export async function updateVendorApprovalStatus(
  vendorId: string,
  newStatus: VendorApprovalStatus
): Promise<void> {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  await updateDoc(ref, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function grantVendorFreeListing(
  vendorId: string,
  adminId: string,
  reason?: string
) {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  await updateDoc(ref, {
    freeListingEnabled: true,
    freeListingReason: reason || "Admin granted",
    freeListingGrantedAt: serverTimestamp(),
    freeListingGrantedBy: adminId,
    updatedAt: serverTimestamp(),
  });
}

export async function revokeVendorFreeListing(vendorId: string) {
  checkFirebase();
  const ref = doc(db!, vendorsCollection, vendorId);
  await updateDoc(ref, {
    freeListingEnabled: false,
    freeListingReason: null,
    freeListingGrantedAt: null,
    freeListingGrantedBy: null,
    updatedAt: serverTimestamp(),
  });
}

export async function getVendorsPendingReview(): Promise<VendorProfile[]> {
  checkFirebase();
  const vendorsRef = collection(db!, vendorsCollection);
  const q = query(
    vendorsRef,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorProfile));
}

export async function listApprovedVendors(): Promise<VendorProfile[]> {
  const firestore = checkFirebase();
  if (!firestore) {
    return MOCK_EMPLOYERS.map(e => ({
      ...e,
      ownerUserId: e.userId,
      businessName: e.organizationName,
      isIndigenousOwned: true,
      approvalStatus: 'approved' as const,
    } as unknown as VendorProfile));
  }
  const vendorsRef = collection(firestore, vendorsCollection);
  const q = query(
    vendorsRef,
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorProfile));
}

// Shop Listings
type ShopListingInput = Omit<
  ShopListing,
  "id" | "createdAt" | "active"
> & { active?: boolean };

export async function createShopListing(
  input: ShopListingInput
): Promise<string> {
  const ref = collection(db!, shopCollection);
  const docRef = await addDoc(ref, {
    ...input,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, shopCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function listShopListings(): Promise<ShopListing[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) {
      return [];
    }
    const ref = collection(firestore, shopCollection);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as ShopListing);
  } catch {
    return [];
  }
}

export async function updateShopListing(
  id: string,
  data: Partial<ShopListing>
) {
  const ref = doc(db!, shopCollection, id);
  await updateDoc(ref, data);
}

// Product/Service Listings
type ProductServiceInput = Omit<
  ProductServiceListing,
  "id" | "createdAt" | "active"
> & { active?: boolean };

export async function createShopListingForVendor(
  vendorId: string,
  data: Omit<ProductServiceInput, "vendorId">
): Promise<string> {
  const ref = collection(db!, productServiceListingsCollection);
  const docRef = await addDoc(ref, {
    vendorId,
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, productServiceListingsCollection, docRef.id), {
    id: docRef.id,
  });
  return docRef.id;
}

export async function updateShopListingForVendor(
  id: string,
  data: Partial<Omit<ProductServiceListing, "id" | "createdAt" | "vendorId">>
) {
  const ref = doc(db!, productServiceListingsCollection, id);
  await updateDoc(ref, data);
}

export async function deleteShopListingForVendor(id: string) {
  const ref = doc(db!, productServiceListingsCollection, id);
  await deleteDoc(ref);
}

export async function listVendorShopListings(
  vendorId: string
): Promise<ProductServiceListing[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];
    const ref = collection(firestore, productServiceListingsCollection);
    const q = query(
      ref,
      where("vendorId", "==", vendorId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as ProductServiceListing);
  } catch {
    return [];
  }
}
