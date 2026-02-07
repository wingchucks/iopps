// Indigenous News Firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  db,
  checkFirebase,
} from "./shared";
import type { NewsArticle, NewsCategory, NewsStatus } from "@/lib/types";

// ============================================
// COLLECTION NAME
// ============================================

export const newsCollection = "news";

// ============================================
// QUERY OPTIONS
// ============================================

export interface ListNewsOptions {
  category?: NewsCategory | "all";
  status?: NewsStatus | "all";
  featured?: boolean;
  limitCount?: number;
}

// ============================================
// PUBLIC LISTING FUNCTIONS
// ============================================

export async function listNewsArticles(
  options: ListNewsOptions = {}
): Promise<NewsArticle[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const {
      category = "all",
      status = "published",
      featured,
      limitCount = 50,
    } = options;

    const ref = collection(firestore, newsCollection);
    const constraints: any[] = [];

    if (status !== "all") {
      constraints.push(where("status", "==", status));
    }

    if (category !== "all") {
      constraints.push(where("category", "==", category));
    }

    if (featured !== undefined) {
      constraints.push(where("featured", "==", featured));
    }

    constraints.push(orderBy("publishedAt", "desc"));

    if (limitCount > 0) {
      constraints.push(limit(limitCount));
    }

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsArticle));
  } catch (error) {
    console.error("Error listing news articles:", error);
    return [];
  }
}

export async function getFeaturedNews(count: number = 5): Promise<NewsArticle[]> {
  return listNewsArticles({
    status: "published",
    featured: true,
    limitCount: count,
  });
}

export async function getDailyBusinessIdea(): Promise<NewsArticle | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;

    const ref = collection(firestore, newsCollection);
    const q = query(
      ref,
      where("status", "==", "published"),
      where("businessIdea", "==", true),
      orderBy("publishedAt", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);

    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as NewsArticle;
  } catch (error) {
    console.error("Error fetching daily business idea:", error);
    return null;
  }
}

// ============================================
// SINGLE ARTICLE RETRIEVAL
// ============================================

export async function getNewsArticle(id: string): Promise<NewsArticle | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;

    const snap = await getDoc(doc(firestore, newsCollection, id));
    if (!snap.exists()) return null;

    return { id: snap.id, ...snap.data() } as NewsArticle;
  } catch (error) {
    console.error("Error fetching news article:", error);
    return null;
  }
}

// ============================================
// TRENDING TAGS
// ============================================

export async function getNewsTags(): Promise<{ tag: string; count: number }[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, newsCollection);
    const q = query(
      ref,
      where("status", "==", "published"),
      orderBy("publishedAt", "desc"),
      limit(100)
    );
    const snap = await getDocs(q);

    const tagCounts: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error fetching news tags:", error);
    return [];
  }
}

// ============================================
// ADMIN CRUD
// ============================================

export async function createNewsArticle(
  data: Omit<NewsArticle, "id" | "createdAt" | "updatedAt">
): Promise<string | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;

    const ref = collection(firestore, newsCollection);
    const docRef = await addDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating news article:", error);
    return null;
  }
}

export async function updateNewsArticle(
  id: string,
  data: Partial<Omit<NewsArticle, "id" | "createdAt">>
): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return false;

    const ref = doc(firestore, newsCollection, id);
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error updating news article:", error);
    return false;
  }
}

export async function deleteNewsArticle(id: string): Promise<boolean> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return false;

    await deleteDoc(doc(firestore, newsCollection, id));
    return true;
  } catch (error) {
    console.error("Error deleting news article:", error);
    return false;
  }
}
