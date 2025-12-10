// Shared imports and utilities for firestore operations
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
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// Re-export firebase utilities for use in domain files
export {
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
  setDoc,
  Timestamp,
  updateDoc,
  where,
  db,
  auth,
};

// Collection names
export const employerCollection = "employers";
export const memberCollection = "memberProfiles";
export const jobsCollection = "jobs";
export const applicationsCollection = "applications";
export const savedJobsCollection = "savedJobs";
export const savedConferencesCollection = "savedConferences";
export const jobAlertsCollection = "jobAlerts";
export const conferencesCollection = "conferences";
export const scholarshipsCollection = "scholarships";
export const scholarshipApplicationsCollection = "scholarshipApplications";
export const shopCollection = "shopListings";
export const powwowsCollection = "powwows";
export const liveStreamsCollection = "liveStreams";
export const vendorsCollection = "vendors";
export const powwowRegistrationsCollection = "powwowRegistrations";
export const conferenceRegistrationsCollection = "conferenceRegistrations";
export const productServiceListingsCollection = "productServiceListings";
export const contactSubmissionsCollection = "contactSubmissions";
export const conversationsCollection = "conversations";
export const messagesCollection = "messages";
export const notificationsCollection = "notifications";

// Helper to check if Firebase is available
export function checkFirebase() {
  if (!db) {
    return null;
  }
  return db;
}
