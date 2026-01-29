import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as path from "path";

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, "../../firebase-service-account.json");
initializeApp({
  credential: cert(serviceAccountPath),
});

const db = getFirestore();

async function addSIIT() {
  const schoolData = {
    name: "Saskatchewan Indian Institute of Technologies",
    shortName: "SIIT",
    type: "Polytechnic",
    website: "https://siit.ca",
    description: "SIIT is a First Nation-governed, credit-granting post-secondary institution established in 1976. With more than 30 academic and quick skills programs offered at 3 campuses and over 35 community learning sites, SIIT serves Indigenous learners across Saskatchewan. 90% of students are Indigenous, and more than 65% of staff and faculty are Indigenous. SIIT has over 60,000 alumni and operates 9 JobConnections employment centres province-wide.",
    indigenousFocused: true,
    headOffice: {
      city: "Saskatoon",
      province: "Saskatchewan",
      address: "Suite 100-103A Packham Avenue, Asimakaniseekan Askiy Reserve",
      postalCode: "S7N 4K4",
    },
    location: {
      city: "Saskatoon",
      province: "Saskatchewan",
      address: "Suite 100-103A Packham Avenue, Asimakaniseekan Askiy Reserve",
      postalCode: "S7N 4K4",
    },
    campuses: [],
    isPublished: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await db.collection("schools").add(schoolData);
    // Update with its own ID
    await docRef.update({ id: docRef.id });
    console.log("SIIT added successfully with ID:", docRef.id);
  } catch (error) {
    console.error("Error adding SIIT:", error);
  }
}

addSIIT();
