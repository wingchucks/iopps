#!/usr/bin/env node

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const LOOKBACK_DAYS = 30;
const OUTPUT_DIR = path.join(__dirname, "output");
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const serviceAccountPath = path.join(__dirname, "../service-account.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("service-account.json not found at project root.");
  console.error("Add service-account.json and rerun: node scripts/audit-application-deliveries.js");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const postCache = new Map();
const employerCache = new Map();

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toIsoString(value) {
  if (!value) return "";
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function csvEscape(value) {
  const normalized = value == null ? "" : String(value);
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function loadPost(postId) {
  if (!postId) return null;
  if (postCache.has(postId)) return postCache.get(postId);

  const [jobSnap, postSnap] = await Promise.all([
    db.collection("jobs").doc(postId).get(),
    db.collection("posts").doc(postId).get(),
  ]);

  let post = null;
  if (jobSnap.exists) {
    post = { id: jobSnap.id, source: "jobs", ...jobSnap.data() };
  } else if (postSnap.exists) {
    post = { id: postSnap.id, source: "posts", ...postSnap.data() };
  }

  postCache.set(postId, post);
  return post;
}

function resolveTargetOrgId(postData) {
  const orgId = normalizeString(postData?.orgId);
  if (orgId) return orgId;

  const employerId = normalizeString(postData?.employerId);
  if (employerId) return employerId;

  return "";
}

async function loadEmployer(orgId) {
  if (!orgId) return null;
  if (employerCache.has(orgId)) return employerCache.get(orgId);

  const employerSnap = await db.collection("employers").doc(orgId).get();
  const employer = employerSnap.exists ? { id: employerSnap.id, ...employerSnap.data() } : null;
  employerCache.set(orgId, employer);
  return employer;
}

function buildCsv(rows) {
  const header = [
    "applicationId",
    "postId",
    "orgId",
    "appliedAt",
    "status",
    "failureReason",
    "employerEmail",
  ];

  return [
    header.join(","),
    ...rows.map((row) =>
      [
        row.applicationId,
        row.postId,
        row.orgId,
        row.appliedAt,
        row.status,
        row.failureReason,
        row.employerEmail,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ].join("\n");
}

async function auditApplication(applicationDoc) {
  const data = applicationDoc.data() || {};
  const delivery = data.delivery || {};
  const postId = normalizeString(data.postId);
  const appliedAt = toIsoString(data.appliedAt);
  const deliveryStatus = normalizeString(delivery.employerNotificationStatus);
  const deliveryError = normalizeString(delivery.employerNotificationError);
  const deliverySentAt = delivery.employerNotificationSentAt;
  let employerEmail = normalizeString(delivery.employerEmailTarget);

  const post = await loadPost(postId);
  const orgId = resolveTargetOrgId(post);

  if (deliverySentAt) {
    return {
      applicationId: applicationDoc.id,
      postId,
      orgId,
      appliedAt,
      status: deliveryStatus || "sent",
      failureReason: "",
      employerEmail,
    };
  }

  if (!post) {
    return {
      applicationId: applicationDoc.id,
      postId,
      orgId: "",
      appliedAt,
      status: deliveryStatus || "bad_request",
      failureReason: deliveryError || "Post document not found in jobs or posts collection",
      employerEmail,
    };
  }

  if (!orgId) {
    return {
      applicationId: applicationDoc.id,
      postId,
      orgId: "",
      appliedAt,
      status: deliveryStatus || "no_org_id",
      failureReason: deliveryError || "Job record has no orgId or employerId",
      employerEmail,
    };
  }

  const employer = await loadEmployer(orgId);
  if (!employer) {
    return {
      applicationId: applicationDoc.id,
      postId,
      orgId,
      appliedAt,
      status: deliveryStatus || "no_employer_doc",
      failureReason: deliveryError || `Employer document ${orgId} not found`,
      employerEmail,
    };
  }

  employerEmail = employerEmail || normalizeString(employer.contactEmail || employer.email);
  if (!employerEmail) {
    return {
      applicationId: applicationDoc.id,
      postId,
      orgId,
      appliedAt,
      status: deliveryStatus || "no_employer_email",
      failureReason: deliveryError || `Employer ${orgId} has no contactEmail or email`,
      employerEmail: "",
    };
  }

  return {
    applicationId: applicationDoc.id,
    postId,
    orgId,
    appliedAt,
    status: deliveryStatus || "missing_delivery_status",
    failureReason: deliveryError || "Employer resolves today; provider outcome was not recorded",
    employerEmail,
  };
}

async function main() {
  const cutoffDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

  console.log(`Auditing applications from the last ${LOOKBACK_DAYS} days...`);
  console.log(`Cutoff: ${cutoffDate.toISOString()}`);

  const applicationsSnap = await db
    .collection("applications")
    .where("appliedAt", ">=", cutoffTimestamp)
    .get();

  console.log(`Found ${applicationsSnap.size} applications.`);

  const rows = [];
  for (const applicationDoc of applicationsSnap.docs) {
    rows.push(await auditApplication(applicationDoc));
  }

  const csv = buildCsv(rows);
  ensureOutputDir();
  const outputPath = path.join(OUTPUT_DIR, `application_deliveries_${TIMESTAMP}.csv`);
  fs.writeFileSync(outputPath, csv, "utf8");

  console.log(`CSV written: ${outputPath}`);
  console.log("Preview:");
  console.log(csv.split("\n").slice(0, 6).join("\n"));
}

main().catch((error) => {
  console.error("Audit failed:", error.message);
  process.exit(1);
});
