// Service-related Firestore operations for Indigenous Marketplace
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  db,
  servicesCollection,
  checkFirebase,
} from "./shared";
import type { Service, ServiceCategory, ServiceStatus, NorthAmericanRegion } from "@/lib/types";

// Helper to generate URL-friendly slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateUniqueSlug(title: string): string {
  const baseSlug = slugify(title);
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${uniqueSuffix}`;
}

export interface ListServicesOptions {
  category?: ServiceCategory;
  region?: NorthAmericanRegion;
  search?: string;
  servesRemote?: boolean;
  indigenousOwned?: boolean;
  featured?: boolean;
  maxResults?: number;
}

// List active services with filters
export async function listServices(options: ListServicesOptions = {}): Promise<Service[]> {
  checkFirebase();
  if (!db) return [];

  const servicesRef = collection(db, servicesCollection);
  const constraints: Parameters<typeof query>[1][] = [
    where("status", "==", "active"),
  ];

  if (options.category) {
    constraints.push(where("category", "==", options.category));
  }

  if (options.region) {
    constraints.push(where("region", "==", options.region));
  }

  if (options.servesRemote !== undefined) {
    constraints.push(where("servesRemote", "==", options.servesRemote));
  }

  if (options.indigenousOwned !== undefined) {
    constraints.push(where("indigenousOwned", "==", options.indigenousOwned));
  }

  if (options.featured !== undefined) {
    constraints.push(where("featured", "==", options.featured));
  }

  // Order by featured first, then by createdAt
  constraints.push(orderBy("featured", "desc"));
  constraints.push(orderBy("createdAt", "desc"));

  if (options.maxResults) {
    constraints.push(limit(options.maxResults));
  }

  const q = query(servicesRef, ...constraints);
  const snapshot = await getDocs(q);

  let services = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Service[];

  // Client-side search filter
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    services = services.filter(
      (s) =>
        s.title.toLowerCase().includes(searchLower) ||
        s.businessName.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower) ||
        s.category.toLowerCase().includes(searchLower) ||
        s.services?.some((svc) => svc.toLowerCase().includes(searchLower))
    );
  }

  return services;
}

// Get featured services
export async function getFeaturedServices(maxResults = 6): Promise<Service[]> {
  return listServices({ featured: true, maxResults });
}

// Get a single service by ID
export async function getService(serviceId: string): Promise<Service | null> {
  checkFirebase();
  if (!db) return null;

  const serviceRef = doc(db, servicesCollection, serviceId);
  const snapshot = await getDoc(serviceRef);

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() } as Service;
}

// Get service by slug
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  checkFirebase();
  if (!db) return null;

  const servicesRef = collection(db, servicesCollection);
  const q = query(servicesRef, where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Service;
}

// Create a new service
export interface CreateServiceInput {
  userId: string;
  vendorId?: string;
  businessName: string;
  title: string;
  tagline?: string;
  description: string;
  category: ServiceCategory;
  location?: string;
  region: NorthAmericanRegion;
  servesRemote: boolean;
  serviceAreas?: string[];
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  bookingUrl?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  portfolioImages?: string[];
  nation?: string;
  indigenousOwned?: boolean;
  communityStory?: string;
  services?: string[];
  industries?: string[];
  certifications?: string[];
  yearsExperience?: number;
  priceRange?: string;
  freeConsultation?: boolean;
}

export async function createService(input: CreateServiceInput): Promise<string> {
  checkFirebase();
  if (!db) throw new Error("Firebase not initialized");

  const slug = generateUniqueSlug(input.title);

  const serviceData: Omit<Service, "id"> = {
    userId: input.userId,
    vendorId: input.vendorId || "",
    businessName: input.businessName,
    slug,
    title: input.title,
    tagline: input.tagline,
    description: input.description,
    category: input.category,
    location: input.location,
    region: input.region,
    servesRemote: input.servesRemote,
    serviceAreas: input.serviceAreas,
    email: input.email,
    phone: input.phone,
    website: input.website,
    linkedin: input.linkedin,
    bookingUrl: input.bookingUrl,
    logoUrl: input.logoUrl,
    coverImageUrl: input.coverImageUrl,
    portfolioImages: input.portfolioImages,
    nation: input.nation,
    indigenousOwned: input.indigenousOwned ?? true,
    communityStory: input.communityStory,
    services: input.services,
    industries: input.industries,
    certifications: input.certifications,
    yearsExperience: input.yearsExperience,
    priceRange: input.priceRange,
    freeConsultation: input.freeConsultation,
    status: "pending" as ServiceStatus,
    featured: false,
    verified: false,
    viewCount: 0,
    contactClicks: 0,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };

  const docRef = await addDoc(collection(db, servicesCollection), serviceData);
  return docRef.id;
}

// Update a service
export async function updateService(
  serviceId: string,
  updates: Partial<Omit<Service, "id" | "userId" | "createdAt">>
): Promise<void> {
  checkFirebase();
  if (!db) throw new Error("Firebase not initialized");

  const serviceRef = doc(db, servicesCollection, serviceId);
  await updateDoc(serviceRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Delete a service
export async function deleteService(serviceId: string): Promise<void> {
  checkFirebase();
  if (!db) throw new Error("Firebase not initialized");

  const serviceRef = doc(db, servicesCollection, serviceId);
  await deleteDoc(serviceRef);
}

// Update service status (for admin approval)
export async function updateServiceStatus(
  serviceId: string,
  status: ServiceStatus
): Promise<void> {
  checkFirebase();
  if (!db) throw new Error("Firebase not initialized");

  const serviceRef = doc(db, servicesCollection, serviceId);
  await updateDoc(serviceRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

// Set service as featured
export async function setServiceFeatured(
  serviceId: string,
  featured: boolean
): Promise<void> {
  checkFirebase();
  if (!db) throw new Error("Firebase not initialized");

  const serviceRef = doc(db, servicesCollection, serviceId);
  await updateDoc(serviceRef, {
    featured,
    updatedAt: serverTimestamp(),
  });
}

// Increment view count
export async function incrementServiceViews(serviceId: string): Promise<void> {
  checkFirebase();
  if (!db) return;

  const serviceRef = doc(db, servicesCollection, serviceId);
  await updateDoc(serviceRef, {
    viewCount: increment(1),
  });
}

// Track contact click (booking URL, phone, email clicks)
export async function trackServiceContactClick(serviceId: string): Promise<void> {
  checkFirebase();
  if (!db) return;

  const serviceRef = doc(db, servicesCollection, serviceId);
  await updateDoc(serviceRef, {
    contactClicks: increment(1),
  });
}

// List services for a specific user/vendor
export async function listUserServices(userId: string): Promise<Service[]> {
  checkFirebase();
  if (!db) return [];

  const servicesRef = collection(db, servicesCollection);
  const q = query(
    servicesRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Service[];
}

// Get services pending review (for admin)
export async function getServicesPendingReview(): Promise<Service[]> {
  checkFirebase();
  if (!db) return [];

  const servicesRef = collection(db, servicesCollection);
  const q = query(
    servicesRef,
    where("status", "==", "pending"),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Service[];
}
