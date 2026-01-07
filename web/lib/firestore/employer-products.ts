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
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EmployerProduct, ProductType, ProductStatus, PaymentMethod } from "@/lib/types";
import { PRODUCT_CATALOG, calculateExpirationDate } from "@/lib/products";

// Get all products for an employer
export async function getEmployerProducts(employerId: string): Promise<EmployerProduct[]> {
  if (!db) throw new Error("Firestore not initialized");

  const productsRef = collection(db, "employers", employerId, "products");
  const q = query(productsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as EmployerProduct));
}

// Get active products for an employer
export async function getActiveEmployerProducts(employerId: string): Promise<EmployerProduct[]> {
  if (!db) throw new Error("Firestore not initialized");

  const productsRef = collection(db, "employers", employerId, "products");
  const q = query(
    productsRef,
    where("status", "==", "active"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as EmployerProduct));
}

// Get active subscription product for an employer (TIER1 or TIER2)
// Returns the subscription info needed for job posting
export async function getActiveSubscriptionProduct(employerId: string): Promise<{
  active: boolean;
  tier: string;
  remainingCredits: number;
  unlimitedPosts: boolean;
  expiresAt: Date;
} | null> {
  if (!db) return null;

  try {
    const productsRef = collection(db, "employers", employerId, "products");
    const q = query(
      productsRef,
      where("status", "==", "active"),
      where("category", "==", "subscription")
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    // Find a non-expired subscription
    const now = new Date();
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);

      if (expiresAt > now) {
        const isUnlimited = data.productType === "TIER2";
        const stats = data.stats || {};
        const jobsRemaining = isUnlimited ? 999999 : (stats.jobsRemaining ?? 15);
        const jobsPosted = stats.jobsPosted ?? 0;

        return {
          active: true,
          tier: data.productType,
          remainingCredits: jobsRemaining - jobsPosted,
          unlimitedPosts: isUnlimited,
          expiresAt,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting active subscription product:", error);
    return null;
  }
}

// Get a single product
export async function getEmployerProduct(
  employerId: string,
  productId: string
): Promise<EmployerProduct | null> {
  if (!db) throw new Error("Firestore not initialized");

  const productRef = doc(db, "employers", employerId, "products", productId);
  const snapshot = await getDoc(productRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as EmployerProduct;
}

// Add a product to an employer (admin action)
export interface AddProductParams {
  employerId: string;
  productType: ProductType;
  paymentMethod: PaymentMethod;
  paidAmount?: number; // Override the paid amount (for discounts)
  durationDays?: number; // Override duration
  quantity?: number; // For job posts (multiply credits)
  grantedBy: string;
  grantedByEmail?: string;
  grantReason?: string;
  notes?: string;
  activatedAt?: Date; // Default to now
  stripePaymentId?: string;
  invoiceNumber?: string;
}

export async function addEmployerProduct(params: AddProductParams): Promise<string> {
  if (!db) throw new Error("Firestore not initialized");

  const config = PRODUCT_CATALOG[params.productType];
  if (!config) throw new Error(`Invalid product type: ${params.productType}`);

  const activatedAt = params.activatedAt || new Date();
  const durationDays = params.durationDays || config.duration;
  const expiresAt = calculateExpirationDate(activatedAt, durationDays);
  const quantity = params.quantity || 1;

  // Calculate stats based on product type and quantity
  let stats = { ...config.defaultStats };

  // Apply quantity multiplier for job products
  if (config.category === "job" && quantity > 1) {
    if (typeof stats.jobsRemaining === "number") {
      stats.jobsRemaining = stats.jobsRemaining * quantity;
    }
    if (typeof stats.featuredJobsRemaining === "number") {
      stats.featuredJobsRemaining = stats.featuredJobsRemaining * quantity;
    }
  }

  const product: Omit<EmployerProduct, "id"> = {
    employerId: params.employerId,
    category: config.category,
    productType: params.productType,
    productName: config.name,
    price: config.price * quantity,
    paidAmount: params.paidAmount ?? (params.paymentMethod === "free_grant" ? 0 : config.price * quantity),
    paymentMethod: params.paymentMethod,
    stripePaymentId: params.stripePaymentId,
    invoiceNumber: params.invoiceNumber,
    activatedAt: Timestamp.fromDate(activatedAt),
    expiresAt: Timestamp.fromDate(expiresAt),
    status: "active",
    grantedBy: params.grantedBy,
    grantedByEmail: params.grantedByEmail,
    grantReason: params.grantReason,
    notes: params.notes,
    stats,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const productsRef = collection(db, "employers", params.employerId, "products");
  const docRef = await addDoc(productsRef, product);

  // Also update the employer's freePostingEnabled for backward compatibility
  // if this is a job or subscription product granted for free
  if (
    params.paymentMethod === "free_grant" &&
    (config.category === "job" || config.category === "subscription")
  ) {
    const employerRef = doc(db, "employers", params.employerId);
    await updateDoc(employerRef, {
      freePostingEnabled: true,
      freePostingReason: params.grantReason || "Admin granted product",
      freePostingGrantedAt: serverTimestamp(),
      freePostingGrantedBy: params.grantedBy,
      updatedAt: serverTimestamp(),
    });
  }

  return docRef.id;
}

// Update product status
export async function updateProductStatus(
  employerId: string,
  productId: string,
  status: ProductStatus
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");

  const productRef = doc(db, "employers", employerId, "products", productId);
  await updateDoc(productRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

// Extend a product's expiration
export async function extendProduct(
  employerId: string,
  productId: string,
  additionalDays: number
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");

  const product = await getEmployerProduct(employerId, productId);
  if (!product) throw new Error("Product not found");

  const currentExpiry = product.expiresAt instanceof Timestamp
    ? product.expiresAt.toDate()
    : new Date();

  // If already expired, extend from today
  const baseDate = currentExpiry < new Date() ? new Date() : currentExpiry;
  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + additionalDays);

  const productRef = doc(db, "employers", employerId, "products", productId);
  await updateDoc(productRef, {
    expiresAt: Timestamp.fromDate(newExpiry),
    status: "active", // Reactivate if was expired
    updatedAt: serverTimestamp(),
  });
}

// Update product stats (e.g., when a job is posted)
export async function updateProductStats(
  employerId: string,
  productId: string,
  statsUpdate: Partial<EmployerProduct["stats"]>
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");

  const productRef = doc(db, "employers", employerId, "products", productId);
  const product = await getEmployerProduct(employerId, productId);

  if (!product) throw new Error("Product not found");

  const newStats = {
    ...product.stats,
    ...statsUpdate,
  };

  await updateDoc(productRef, {
    stats: newStats,
    updatedAt: serverTimestamp(),
  });
}

// Cancel a product
export async function cancelProduct(
  employerId: string,
  productId: string,
  reason?: string
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");

  const productRef = doc(db, "employers", employerId, "products", productId);
  await updateDoc(productRef, {
    status: "cancelled",
    notes: reason ? `Cancelled: ${reason}` : "Cancelled by admin",
    updatedAt: serverTimestamp(),
  });
}

// Delete a product (hard delete - use sparingly)
export async function deleteProduct(
  employerId: string,
  productId: string
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");

  const productRef = doc(db, "employers", employerId, "products", productId);
  await deleteDoc(productRef);
}

// Check if employer has active product of specific type
export async function hasActiveProduct(
  employerId: string,
  productType: ProductType
): Promise<boolean> {
  if (!db) throw new Error("Firestore not initialized");

  const productsRef = collection(db, "employers", employerId, "products");
  const q = query(
    productsRef,
    where("productType", "==", productType),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(q);

  return !snapshot.empty;
}

// Get employer's remaining job credits across all active products
export async function getEmployerJobCredits(employerId: string): Promise<{
  jobsRemaining: number | "unlimited";
  featuredRemaining: number;
}> {
  const products = await getActiveEmployerProducts(employerId);

  let totalJobs: number | "unlimited" = 0;
  let totalFeatured = 0;

  for (const product of products) {
    // Check expiration
    const expiresAt = product.expiresAt instanceof Timestamp
      ? product.expiresAt.toDate()
      : null;

    if (expiresAt && expiresAt < new Date()) continue;

    if (product.stats.jobsRemaining === "unlimited") {
      totalJobs = "unlimited";
    } else if (totalJobs !== "unlimited" && typeof product.stats.jobsRemaining === "number") {
      totalJobs += product.stats.jobsRemaining;
    }

    if (typeof product.stats.featuredJobsRemaining === "number") {
      totalFeatured += product.stats.featuredJobsRemaining;
    }
  }

  return {
    jobsRemaining: totalJobs,
    featuredRemaining: totalFeatured,
  };
}
