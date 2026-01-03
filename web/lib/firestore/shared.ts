// Shared imports and utilities for firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// Re-export firebase utilities for use in domain files
export {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  db,
  auth,
};

export type { QueryDocumentSnapshot, DocumentData };

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
export const trainingProgramsCollection = "training_programs";
export const memberLearningCollection = "member_learning";
export const savedTrainingCollection = "savedTraining";
export const servicesCollection = "services";

// Education Pillar collections
export const schoolsCollection = "schools";
export const educationProgramsCollection = "education_programs";
export const educationEventsCollection = "education_events";
export const studentInquiriesCollection = "student_inquiries";
export const savedProgramsCollection = "savedPrograms";
export const savedSchoolsCollection = "savedSchools";
export const importJobsCollection = "import_jobs";

// Business Pillar collections
export const businessGrantsCollection = "business_grants";

// Helper to check if Firebase is available
export function checkFirebase() {
  if (!db) {
    return null;
  }
  return db;
}
