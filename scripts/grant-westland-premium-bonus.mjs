import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import admin from "firebase-admin";

const DEFAULT_ORG_ID = "UyTZcF7xEiRmBnSEzcSMmw9MXvL2";
const DEFAULT_PLAN_ID = "tier2";
const DEFAULT_PLAN_TIER = "premium";
const DEFAULT_BILLING_START = "2026-04-01T00:00:00.000Z";
const DEFAULT_SUBSCRIPTION_END = "2027-04-01T00:00:00.000Z";
const DEFAULT_BONUS_END = "2026-03-31T23:59:59.999Z";

function loadLocalEnv() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    if (!process.env[key]) {
      process.env[key] = rest.join("=").trim().replace(/^"|"$/g, "");
    }
  }
}

function getCredential() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault();
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
    return admin.credential.cert(JSON.parse(decoded));
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }

  throw new Error(
    "Missing Firebase Admin credentials. Set GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT_BASE64, FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.",
  );
}

async function main() {
  loadLocalEnv();

  if (!admin.apps.length) {
    admin.initializeApp({ credential: getCredential() });
  }

  const db = admin.firestore();
  const orgId = process.env.WESTLAND_ORG_ID || DEFAULT_ORG_ID;
  const now = new Date();
  const billingStartAt = new Date(process.env.WESTLAND_BILLING_START || DEFAULT_BILLING_START);
  const subscriptionEnd = new Date(process.env.WESTLAND_SUBSCRIPTION_END || DEFAULT_SUBSCRIPTION_END);
  const bonusAccessEndsAt = new Date(process.env.WESTLAND_BONUS_END || DEFAULT_BONUS_END);
  const bonusAccessReason = process.env.WESTLAND_BONUS_REASON || "Bonus early access before paid term begins";

  const employerRef = db.collection("employers").doc(orgId);
  const orgRef = db.collection("organizations").doc(orgId);

  const subscriptionPayload = {
    tier: DEFAULT_PLAN_TIER,
    status: "active",
    billingStartAt: billingStartAt.toISOString(),
    subscriptionEnd: subscriptionEnd.toISOString(),
    bonusAccessGrantedAt: now.toISOString(),
    bonusAccessEndsAt: bonusAccessEndsAt.toISOString(),
    bonusAccessReason,
  };

  await employerRef.set(
    {
      plan: DEFAULT_PLAN_TIER,
      subscriptionTier: DEFAULT_PLAN_TIER,
      subscriptionStatus: "active",
      subscriptionStart: billingStartAt.toISOString(),
      subscriptionEnd: subscriptionEnd.toISOString(),
      billingStartAt: billingStartAt.toISOString(),
      bonusAccessGrantedAt: now.toISOString(),
      bonusAccessEndsAt: bonusAccessEndsAt.toISOString(),
      bonusAccessReason,
      updatedAt: now.toISOString(),
      subscription: subscriptionPayload,
    },
    { merge: true },
  );

  await orgRef.set(
    {
      plan: DEFAULT_PLAN_TIER,
      subscriptionTier: DEFAULT_PLAN_TIER,
      tier: DEFAULT_PLAN_TIER,
      billingStartAt: billingStartAt.toISOString(),
      bonusAccessGrantedAt: now.toISOString(),
      bonusAccessEndsAt: bonusAccessEndsAt.toISOString(),
      bonusAccessReason,
      updatedAt: now.toISOString(),
      subscription: subscriptionPayload,
    },
    { merge: true },
  );

  const existingSubscription = await db
    .collection("subscriptions")
    .where("orgId", "==", orgId)
    .where("plan", "==", DEFAULT_PLAN_ID)
    .where("billingCycle", "==", "annual")
    .limit(1)
    .get();

  const subscriptionDoc = {
    orgId,
    plan: DEFAULT_PLAN_ID,
    status: "active",
    amount: 2500,
    gstAmount: 125,
    totalAmount: 2625,
    billingCycle: "annual",
    startsAt: billingStartAt,
    expiresAt: subscriptionEnd,
    manualOverride: true,
    bonusAccessGrantedAt: now,
    bonusAccessEndsAt,
    bonusAccessReason,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!existingSubscription.empty) {
    await existingSubscription.docs[0].ref.set(subscriptionDoc, { merge: true });
    console.log(`Updated existing Westland subscription record: ${existingSubscription.docs[0].id}`);
  } else {
    await db.collection("subscriptions").add({
      ...subscriptionDoc,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("Created new Westland subscription record.");
  }

  console.log(`Westland premium access is active now; paid term starts ${billingStartAt.toISOString()}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
