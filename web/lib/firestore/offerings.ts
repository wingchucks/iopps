// Unified Offerings Firestore operations
// Wraps products and services into a single interface
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  checkFirebase,
  vendorsCollection,
  productServiceListingsCollection,
  servicesCollection,
} from "./shared";
import type { UnifiedOffering, OfferingType, VendorProduct, Service, Vendor } from "@/lib/types";

/**
 * Convert a VendorProduct to UnifiedOffering
 */
function productToOffering(product: VendorProduct & { id: string }): UnifiedOffering {
  return {
    id: product.id,
    type: 'product',
    userId: '', // Will be set from vendor
    vendorId: product.vendorId,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    priceDisplay: product.priceDisplay,
    imageUrl: product.imageUrl,
    images: product.images,
    active: product.active,
    featured: product.featured,
    inStock: product.inStock,
    madeToOrder: product.madeToOrder,
    viewCount: 0, // Products don't have viewCount currently
    contactClicks: 0,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * Convert a Service to UnifiedOffering
 */
function serviceToOffering(service: Service & { id: string }): UnifiedOffering {
  return {
    id: service.id,
    type: 'service',
    userId: service.userId,
    vendorId: service.vendorId,
    name: service.title || service.businessName,
    slug: service.slug,
    description: service.description,
    category: service.category,
    priceDisplay: service.priceRange,
    imageUrl: service.logoUrl,
    images: service.portfolioImages,
    active: service.status === 'active' || service.status === 'approved',
    featured: service.featured,
    servesRemote: service.servesRemote,
    bookingUrl: service.bookingUrl,
    viewCount: service.viewCount,
    contactClicks: service.contactClicks,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

/**
 * Get all offerings (products and services) for a user
 */
export async function listUserOfferings(userId: string): Promise<UnifiedOffering[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  const offerings: UnifiedOffering[] = [];

  try {
    // First get the vendor profile to get vendorId
    const vendorQuery = query(
      collection(firestore, vendorsCollection),
      where("userId", "==", userId)
    );
    const vendorSnap = await getDocs(vendorQuery);

    if (!vendorSnap.empty) {
      const vendorDoc = vendorSnap.docs[0];
      const vendorId = vendorDoc.id;
      const vendor = vendorDoc.data() as Vendor;

      // Get products for this vendor
      const productsQuery = query(
        collection(firestore, productServiceListingsCollection),
        where("vendorId", "==", vendorId),
        orderBy("createdAt", "desc")
      );

      try {
        const productsSnap = await getDocs(productsQuery);

        for (const docSnap of productsSnap.docs) {
          const product = { id: docSnap.id, ...docSnap.data() } as VendorProduct & { id: string };
          const offering = productToOffering(product);
          offering.userId = vendor.userId;
          offerings.push(offering);
        }
      } catch {
        // Products collection may not have the index
        console.log("Products query without orderBy");
        const productsQuery2 = query(
          collection(firestore, productServiceListingsCollection),
          where("vendorId", "==", vendorId)
        );
        const productsSnap = await getDocs(productsQuery2);

        for (const docSnap of productsSnap.docs) {
          const product = { id: docSnap.id, ...docSnap.data() } as VendorProduct & { id: string };
          const offering = productToOffering(product);
          offering.userId = vendor.userId;
          offerings.push(offering);
        }
      }
    }

    // Get services for this user
    const servicesQuery = query(
      collection(firestore, servicesCollection),
      where("userId", "==", userId)
    );

    const servicesSnap = await getDocs(servicesQuery);

    for (const docSnap of servicesSnap.docs) {
      const service = { id: docSnap.id, ...docSnap.data() } as Service & { id: string };
      offerings.push(serviceToOffering(service));
    }

    // Sort by createdAt desc
    offerings.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      const aDate = a.createdAt instanceof Date ? a.createdAt : a.createdAt.toDate();
      const bDate = b.createdAt instanceof Date ? b.createdAt : b.createdAt.toDate();
      return bDate.getTime() - aDate.getTime();
    });

    return offerings;
  } catch (error) {
    console.error("Error listing user offerings:", error);
    return [];
  }
}

/**
 * Get offerings filtered by type
 */
export async function listUserOfferingsByType(
  userId: string,
  type: OfferingType
): Promise<UnifiedOffering[]> {
  const allOfferings = await listUserOfferings(userId);
  return allOfferings.filter(offering => offering.type === type);
}

/**
 * Get offering counts by type
 */
export async function getOfferingCounts(userId: string): Promise<{ products: number; services: number; total: number }> {
  const firestore = checkFirebase();
  if (!firestore) return { products: 0, services: 0, total: 0 };

  let products = 0;
  let services = 0;

  try {
    // Get vendor to find products
    const vendorQuery = query(
      collection(firestore, vendorsCollection),
      where("userId", "==", userId)
    );
    const vendorSnap = await getDocs(vendorQuery);

    if (!vendorSnap.empty) {
      const vendorId = vendorSnap.docs[0].id;

      const productsQuery = query(
        collection(firestore, productServiceListingsCollection),
        where("vendorId", "==", vendorId)
      );
      const productsSnap = await getDocs(productsQuery);
      products = productsSnap.size;
    }

    // Get services count
    const servicesQuery = query(
      collection(firestore, servicesCollection),
      where("userId", "==", userId)
    );
    const servicesSnap = await getDocs(servicesQuery);
    services = servicesSnap.size;

    return { products, services, total: products + services };
  } catch (error) {
    console.error("Error getting offering counts:", error);
    return { products: 0, services: 0, total: 0 };
  }
}

/**
 * Get a single offering by ID and type
 */
export async function getOffering(
  offeringId: string,
  type: OfferingType
): Promise<UnifiedOffering | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  try {
    if (type === 'product') {
      const ref = doc(firestore, productServiceListingsCollection, offeringId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;

      const product = { id: snap.id, ...snap.data() } as VendorProduct & { id: string };
      return productToOffering(product);
    } else {
      const ref = doc(firestore, servicesCollection, offeringId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;

      const service = { id: snap.id, ...snap.data() } as Service & { id: string };
      return serviceToOffering(service);
    }
  } catch (error) {
    console.error("Error getting offering:", error);
    return null;
  }
}

/**
 * Get active offering counts for dashboard display
 */
export async function getActiveOfferingCounts(userId: string): Promise<{ products: number; services: number; total: number }> {
  const firestore = checkFirebase();
  if (!firestore) return { products: 0, services: 0, total: 0 };

  let products = 0;
  let services = 0;

  try {
    // Get vendor to find products
    const vendorQuery = query(
      collection(firestore, vendorsCollection),
      where("userId", "==", userId)
    );
    const vendorSnap = await getDocs(vendorQuery);

    if (!vendorSnap.empty) {
      const vendorId = vendorSnap.docs[0].id;

      const productsQuery = query(
        collection(firestore, productServiceListingsCollection),
        where("vendorId", "==", vendorId),
        where("active", "==", true)
      );
      const productsSnap = await getDocs(productsQuery);
      products = productsSnap.size;
    }

    // Get active services count
    const servicesQuery = query(
      collection(firestore, servicesCollection),
      where("userId", "==", userId),
      where("status", "in", ["active", "approved"])
    );
    const servicesSnap = await getDocs(servicesQuery);
    services = servicesSnap.size;

    return { products, services, total: products + services };
  } catch (error) {
    console.error("Error getting active offering counts:", error);
    return { products: 0, services: 0, total: 0 };
  }
}
