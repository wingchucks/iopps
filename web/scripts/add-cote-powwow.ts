/**
 * Add Cote First Nation 3rd Annual Pow Wow to the community events
 */
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Initialize Firebase Admin
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!serviceAccountBase64) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 not found in environment");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  Buffer.from(serviceAccountBase64, "base64").toString("utf-8")
);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function addCotePowwow() {
  const event = {
    // Required fields
    name: "Cote First Nation 3rd Annual Pow Wow",
    employerId: "iopps-admin", // Using IOPPS admin as the poster
    location: "Cote First Nation Arbour",
    description: `🪶 Join us for the Cote First Nation 3rd Annual Pow Wow!

📅 July 9th & 10th, 2026
📍 Cote First Nation Arbour, Saskatchewan

Everyone Welcome! Come celebrate Indigenous culture, music, dance, and community.

IOPPS.ca will be live streaming this event - stay tuned for broadcast details!

#PowWow #Indigenous #CoteFirstNation #Saskatchewan`,
    active: true,
    
    // Optional fields
    host: "Cote First Nation",
    region: "Saskatchewan",
    eventType: "Pow Wow",
    startDate: "2026-07-09",
    endDate: "2026-07-10",
    dateRange: "July 9-10, 2026",
    season: "Summer 2026",
    livestream: true,
    featured: true,
    registrationStatus: "Open",
    imageUrl: "", // Could add the poster image URL if uploaded to storage
    createdAt: Timestamp.now(),
  };

  try {
    // Add to powwowEvents collection
    const docRef = await db.collection('powwowEvents').add(event);
    console.log('✅ Successfully added Cote First Nation Pow Wow!');
    console.log(`   Document ID: ${docRef.id}`);
    console.log(`   Event: ${event.name}`);
    console.log(`   Dates: ${event.dateRange}`);
    console.log(`   Location: ${event.location}`);
    console.log(`   Livestream: ${event.livestream ? 'Yes' : 'No'}`);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding event:', error);
    throw error;
  }
}

// Run the script
addCotePowwow()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
