import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";

export interface ShopVendor {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logo: string;
  bannerImage: string;
  location: { city: string; province: string };
  website: string;
  phone: string;
  email: string;
  socialLinks: { facebook: string; linkedin: string; instagram: string };
  featured: boolean;
  createdAt: unknown;
}

export interface ShopListing {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  title: string;
  description: string;
  type: "product" | "service";
  price: number | null;
  image: string;
  category: string;
  tags: string[];
  featured: boolean;
  active: boolean;
  createdAt: unknown;
}

export interface VendorFilters {
  category?: string;
  location?: string;
}

export interface ListingFilters {
  type?: "product" | "service";
  category?: string;
  priceMin?: number;
  priceMax?: number;
}

export async function getVendors(filters?: VendorFilters): Promise<ShopVendor[]> {
  const constraints: QueryConstraint[] = [];

  if (filters?.category) {
    constraints.push(where("category", "==", filters.category));
  }

  constraints.push(orderBy("name", "asc"));

  const q = query(collection(db, "shop_vendors"), ...constraints);
  const snap = await getDocs(q);
  let vendors = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopVendor));

  if (filters?.location) {
    vendors = vendors.filter(
      (v) =>
        v.location?.city?.toLowerCase().includes(filters.location!.toLowerCase()) ||
        v.location?.province?.toLowerCase().includes(filters.location!.toLowerCase())
    );
  }

  return vendors;
}

export async function getVendorBySlug(slug: string): Promise<ShopVendor | null> {
  const q = query(collection(db, "shop_vendors"), where("slug", "==", slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as ShopVendor;
}

export async function getListings(filters?: ListingFilters): Promise<ShopListing[]> {
  const constraints: QueryConstraint[] = [where("active", "==", true)];

  if (filters?.type) {
    constraints.push(where("type", "==", filters.type));
  }
  if (filters?.category) {
    constraints.push(where("category", "==", filters.category));
  }

  constraints.push(orderBy("createdAt", "desc"));

  const q = query(collection(db, "shop_listings"), ...constraints);
  const snap = await getDocs(q);
  let listings = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopListing));

  if (filters?.priceMin != null) {
    listings = listings.filter((l) => l.price != null && l.price >= filters.priceMin!);
  }
  if (filters?.priceMax != null) {
    listings = listings.filter((l) => l.price != null && l.price <= filters.priceMax!);
  }

  return listings;
}

export async function getVendorListings(vendorId: string): Promise<ShopListing[]> {
  const q = query(
    collection(db, "shop_listings"),
    where("vendorId", "==", vendorId),
    where("active", "==", true),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopListing));
}

export async function searchListings(searchQuery: string): Promise<ShopListing[]> {
  // Firestore doesn't support full-text search natively.
  // Fetch all active listings and filter client-side.
  const q = query(
    collection(db, "shop_listings"),
    where("active", "==", true),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopListing));

  const lower = searchQuery.toLowerCase();
  return all.filter(
    (l) =>
      l.title.toLowerCase().includes(lower) ||
      l.description.toLowerCase().includes(lower) ||
      l.tags?.some((t) => t.toLowerCase().includes(lower))
  );
}
