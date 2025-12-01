/**
 * Shop Indigenous Category Operations
 *
 * Operations for managing categories in the Shop Indigenous marketplace.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  Timestamp,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  order: number;
  vendorCount: number;
  isActive: boolean;
  imageUrl?: string;
  icon?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CategoryWithChildren extends Category {
  subcategories: Category[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES_COLLECTION = "categories";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkFirebase() {
  if (!db) {
    throw new Error("Firebase not initialized");
  }
  return db;
}

// ============================================================================
// CATEGORY OPERATIONS
// ============================================================================

/**
 * Get all categories with subcategories nested under parents
 */
export async function getCategories(): Promise<CategoryWithChildren[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, CATEGORIES_COLLECTION);

    const q = query(
      ref,
      where("isActive", "==", true),
      orderBy("order", "asc")
    );

    const snap = await getDocs(q);

    const allCategories = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Category[];

    // Separate parents and children
    const parents = allCategories.filter((cat) => !cat.parentId);
    const children = allCategories.filter((cat) => cat.parentId);

    // Nest children under parents
    const categoriesWithChildren: CategoryWithChildren[] = parents.map(
      (parent) => ({
        ...parent,
        subcategories: children
          .filter((child) => child.parentId === parent.id)
          .sort((a, b) => a.order - b.order),
      })
    );

    return categoriesWithChildren;
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
}

/**
 * Get all parent categories (without nesting)
 */
export async function getParentCategories(): Promise<Category[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, CATEGORIES_COLLECTION);

    const q = query(
      ref,
      where("isActive", "==", true),
      where("parentId", "==", null),
      orderBy("order", "asc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Category[];
  } catch (error) {
    console.error("Error getting parent categories:", error);
    return [];
  }
}

/**
 * Get a single category by slug
 */
export async function getCategoryBySlug(
  slug: string
): Promise<CategoryWithChildren | null> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, CATEGORIES_COLLECTION);

    const q = query(
      ref,
      where("slug", "==", slug),
      where("isActive", "==", true)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    const category = {
      id: snap.docs[0].id,
      ...snap.docs[0].data(),
    } as Category;

    // Get subcategories if this is a parent
    const subcategories = await getSubcategories(category.id);

    return {
      ...category,
      subcategories,
    };
  } catch (error) {
    console.error("Error getting category by slug:", error);
    return null;
  }
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, CATEGORIES_COLLECTION, id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...snap.data(),
    } as Category;
  } catch (error) {
    console.error("Error getting category by ID:", error);
    return null;
  }
}

/**
 * Get subcategories for a parent category
 */
export async function getSubcategories(parentId: string): Promise<Category[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, CATEGORIES_COLLECTION);

    const q = query(
      ref,
      where("parentId", "==", parentId),
      where("isActive", "==", true),
      orderBy("order", "asc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Category[];
  } catch (error) {
    console.error("Error getting subcategories:", error);
    return [];
  }
}

/**
 * Get the parent category for a subcategory
 */
export async function getParentCategory(
  categoryId: string
): Promise<Category | null> {
  try {
    const category = await getCategoryById(categoryId);

    if (!category || !category.parentId) {
      return null;
    }

    return getCategoryById(category.parentId);
  } catch (error) {
    console.error("Error getting parent category:", error);
    return null;
  }
}

/**
 * Get category breadcrumbs (for navigation)
 */
export async function getCategoryBreadcrumbs(
  categoryId: string
): Promise<Category[]> {
  try {
    const breadcrumbs: Category[] = [];
    let currentCategory = await getCategoryById(categoryId);

    while (currentCategory) {
      breadcrumbs.unshift(currentCategory);

      if (currentCategory.parentId) {
        currentCategory = await getCategoryById(currentCategory.parentId);
      } else {
        break;
      }
    }

    return breadcrumbs;
  } catch (error) {
    console.error("Error getting category breadcrumbs:", error);
    return [];
  }
}

/**
 * Search categories by name
 */
export async function searchCategories(
  queryStr: string,
  limit: number = 10
): Promise<Category[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, CATEGORIES_COLLECTION);

    const normalizedQuery = queryStr.toLowerCase().trim();

    if (!normalizedQuery) {
      return [];
    }

    // Fetch all active categories and filter client-side
    const q = query(ref, where("isActive", "==", true), orderBy("name", "asc"));

    const snap = await getDocs(q);

    return snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter((cat: any) => cat.name.toLowerCase().includes(normalizedQuery))
      .slice(0, limit) as Category[];
  } catch (error) {
    console.error("Error searching categories:", error);
    return [];
  }
}

/**
 * Update vendor count for a category (admin/internal use)
 */
export async function updateCategoryVendorCount(
  categoryId: string,
  count: number
): Promise<void> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, CATEGORIES_COLLECTION, categoryId);

    await updateDoc(ref, {
      vendorCount: count,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating category vendor count:", error);
    throw error;
  }
}

/**
 * Get all categories as a flat list (useful for dropdowns)
 */
export async function getAllCategoriesFlat(): Promise<Category[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, CATEGORIES_COLLECTION);

    const q = query(
      ref,
      where("isActive", "==", true),
      orderBy("order", "asc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Category[];
  } catch (error) {
    console.error("Error getting all categories flat:", error);
    return [];
  }
}

/**
 * Category icon mapping (for UI display)
 */
export const CATEGORY_ICONS: Record<string, string> = {
  "art-fine-crafts": "palette",
  "jewelry-accessories": "gem",
  "textiles-clothing": "shirt",
  "home-living": "home",
  "food-beverage": "utensils",
  "professional-services": "briefcase",
  experiences: "compass",
};

/**
 * Get icon for a category
 */
export function getCategoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] || "folder";
}
