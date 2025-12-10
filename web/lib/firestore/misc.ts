// Miscellaneous Firestore operations (global search, contacts, settings, RSS, job alerts)
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
  jobAlertsCollection,
  contactSubmissionsCollection,
  checkFirebase,
} from "./shared";
import type {
  JobPosting,
  Scholarship,
  Conference,
  PowwowEvent,
  Vendor,
  ContactSubmission,
  PlatformSettings,
  RSSFeed,
  JobAlert,
} from "@/lib/types";

// Import domain functions for global search
import { listJobPostings } from "./jobs";
import { listScholarships } from "./scholarships";
import { listConferences } from "./conferences";
import { listPowwowEvents } from "./powwows";
import { listShopListings } from "./vendors";

type ShopListing = Vendor;

// Global Search
export type GlobalSearchResults = {
  jobs: JobPosting[];
  scholarships: Scholarship[];
  conferences: Conference[];
  powwows: PowwowEvent[];
  shop: ShopListing[];
  totalResults: number;
};

export async function globalSearch(
  keyword: string,
  searchLimit: number = 10
): Promise<GlobalSearchResults> {
  if (!keyword || keyword.trim().length === 0) {
    return {
      jobs: [],
      scholarships: [],
      conferences: [],
      powwows: [],
      shop: [],
      totalResults: 0,
    };
  }

  const searchTerm = keyword.toLowerCase().trim();

  try {
    checkFirebase();

    const [jobs, scholarships, conferences, powwows, shop] = await Promise.all([
      listJobPostings({ activeOnly: true }),
      listScholarships(),
      listConferences(),
      listPowwowEvents(),
      listShopListings(),
    ]);

    const matchedJobs = jobs
      .filter((job) => {
        const text = `${job.title ?? ""} ${job.employerName ?? ""} ${job.description ?? ""
          } ${job.location ?? ""}`.toLowerCase();
        return text.includes(searchTerm);
      })
      .slice(0, searchLimit);

    const matchedScholarships = scholarships
      .filter((scholarship) => {
        const text = `${scholarship.title} ${scholarship.provider} ${scholarship.description}`.toLowerCase();
        return text.includes(searchTerm);
      })
      .slice(0, searchLimit);

    const matchedConferences = conferences
      .filter((conference) => {
        const text = `${conference.title} ${conference.employerName ?? ""} ${conference.description
          } ${conference.location}`.toLowerCase();
        return text.includes(searchTerm);
      })
      .slice(0, searchLimit);

    const matchedPowwows = powwows
      .filter((powwow) => {
        const text = `${powwow.name} ${powwow.host ?? ""} ${powwow.description ?? ""
          } ${powwow.location ?? ""}`.toLowerCase();
        return text.includes(searchTerm);
      })
      .slice(0, searchLimit);

    const matchedShop = shop
      .filter((item) => {
        const text = `${item.businessName} ${item.nation ?? ""} ${item.description ?? ""} ${item.category ?? ""
          }`.toLowerCase();
        return text.includes(searchTerm);
      })
      .slice(0, searchLimit);

    const totalResults =
      matchedJobs.length +
      matchedScholarships.length +
      matchedConferences.length +
      matchedPowwows.length +
      matchedShop.length;

    return {
      jobs: matchedJobs,
      scholarships: matchedScholarships,
      conferences: matchedConferences,
      powwows: matchedPowwows,
      shop: matchedShop,
      totalResults,
    };
  } catch (error) {
    console.error("Global search error:", error);
    return {
      jobs: [],
      scholarships: [],
      conferences: [],
      powwows: [],
      shop: [],
      totalResults: 0,
    };
  }
}

// Contact Submissions
export interface ContactSubmissionInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export async function createContactSubmission(
  data: ContactSubmissionInput
): Promise<string> {
  checkFirebase();

  try {
    const submissionData = {
      name: data.name,
      email: data.email,
      subject: data.subject || undefined,
      message: data.message,
      status: "new" as const,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db!, contactSubmissionsCollection),
      submissionData
    );

    return docRef.id;
  } catch (error) {
    console.error("Error creating contact submission:", error);
    throw new Error("Failed to submit contact form");
  }
}

export async function listContactSubmissions(): Promise<ContactSubmission[]> {
  checkFirebase();
  try {
    const q = query(
      collection(db!, contactSubmissionsCollection),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as ContactSubmission));
  } catch (error) {
    console.error("Error listing contact submissions:", error);
    return [];
  }
}

export async function updateContactSubmissionStatus(
  id: string,
  status: "new" | "read" | "responded"
) {
  checkFirebase();
  const ref = doc(db!, contactSubmissionsCollection, id);
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });
}

// Platform Settings
const settingsCollection = "settings";
const settingsDocId = "platform";

export async function getPlatformSettings(): Promise<PlatformSettings | null> {
  try {
    checkFirebase();
    const ref = doc(db!, settingsCollection, settingsDocId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as PlatformSettings;
  } catch (error) {
    console.error("Error fetching platform settings:", error);
    return null;
  }
}

export async function updatePlatformSettings(
  settings: Partial<PlatformSettings>,
  userId: string
) {
  checkFirebase();
  const ref = doc(db!, settingsCollection, settingsDocId);
  await setDoc(
    ref,
    {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true }
  );
}

// RSS Feeds
const rssFeedsCollection = "rssFeeds";

export async function createRSSFeed(
  data: Omit<RSSFeed, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  checkFirebase();
  const ref = collection(db!, rssFeedsCollection);
  const docRef = await addDoc(ref, {
    ...data,
    active: data.active ?? true,
    totalJobsImported: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db!, rssFeedsCollection, docRef.id), { id: docRef.id });
  return docRef.id;
}

export async function listRSSFeeds(employerId?: string): Promise<RSSFeed[]> {
  checkFirebase();
  try {
    const ref = collection(db!, rssFeedsCollection);
    const constraints = [];

    if (employerId) {
      constraints.push(where("employerId", "==", employerId));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data() as RSSFeed);
  } catch (error) {
    console.error("Error listing RSS feeds:", error);
    return [];
  }
}

export async function getRSSFeed(id: string): Promise<RSSFeed | null> {
  checkFirebase();
  try {
    const ref = doc(db!, rssFeedsCollection, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as RSSFeed;
  } catch (error) {
    console.error("Error getting RSS feed:", error);
    return null;
  }
}

export async function updateRSSFeed(
  id: string,
  data: Partial<RSSFeed>
): Promise<void> {
  checkFirebase();
  const ref = doc(db!, rssFeedsCollection, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRSSFeed(id: string): Promise<void> {
  checkFirebase();
  const ref = doc(db!, rssFeedsCollection, id);
  await deleteDoc(ref);
}

// Job Alerts
export async function createJobAlert(alert: Omit<JobAlert, "id" | "createdAt" | "updatedAt">) {
  const ref = collection(db!, jobAlertsCollection);
  const docRef = await addDoc(ref, {
    ...alert,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getMemberJobAlerts(memberId: string): Promise<JobAlert[]> {
  const q = query(
    collection(db!, jobAlertsCollection),
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as JobAlert));
}

export async function deleteJobAlert(alertId: string) {
  await deleteDoc(doc(db!, jobAlertsCollection, alertId));
}

export async function updateJobAlert(alertId: string, data: Partial<JobAlert>) {
  const ref = doc(db!, jobAlertsCollection, alertId);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
