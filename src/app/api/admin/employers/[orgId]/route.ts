import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken, verifySuperAdminToken } from "@/lib/api-auth";
import { adminDb, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue, type DocumentReference, type Query } from "firebase-admin/firestore";
import { normalizeAdminEmployerRow } from "@/lib/admin/employers";
import { isSuperAdminEmail } from "@/lib/server/super-admin";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;
type LinkedUserPolicy = "unlink" | "delete";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function recordFrom(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

export function buildOrganizationSoftDeleteMetadata(adminId: string, deletedAt: string) {
  return {
    disabled: true,
    status: "disabled",
    deletedAt,
    deletedBy: adminId,
    updatedAt: deletedAt,
    isPublished: false,
    publicationStatus: "SUSPENDED",
    publicVisibility: "hidden",
    directoryVisible: false,
    isDirectoryVisible: false,
  };
}

export function buildSoftDeleteContentPatch(
  collectionId: string,
  deletedAt: string,
): Record<string, unknown> | null {
  switch (collectionId) {
    case "jobs":
      return { active: false, status: "deleted", updatedAt: deletedAt };
    case "posts":
      return { status: "deleted", updatedAt: deletedAt };
    case "events":
      return { active: false, status: "deleted", updatedAt: deletedAt };
    case "scholarships":
      return { active: false, status: "deleted", updatedAt: deletedAt };
    default:
      return null;
  }
}

function buildOrganizationMirrorFromEmployer(
  employerData: UnknownRecord,
): UnknownRecord {
  const links = recordFrom(employerData.links);
  const socialLinks = recordFrom(employerData.socialLinks);
  const normalizedType =
    text(employerData.type).toLowerCase() === "school" ||
    text(employerData.accountType).toLowerCase() === "school" ||
    text(employerData.orgType).toLowerCase() === "school"
      ? "school"
      : "business";

  const next: UnknownRecord = {
    name:
      text(employerData.companyName) ||
      text(employerData.organizationName) ||
      text(employerData.displayName) ||
      text(employerData.name),
    description: text(employerData.description) || text(employerData.story),
    website: text(employerData.website) || text(links.website),
    logoUrl: text(employerData.logoUrl) || text(employerData.logo),
    slug: text(employerData.slug),
    contactEmail:
      text(employerData.contactEmail) ||
      text(employerData.email),
    phone:
      text(employerData.phone) ||
      text(employerData.contactPhone),
    location:
      employerData.location ??
      [text(employerData.city), text(employerData.province)].filter(Boolean).join(", "),
    verified: employerData.verified === true,
    status: text(employerData.status) || "approved",
    emailVerified: employerData.emailVerified === true,
    onboardingComplete: employerData.onboardingComplete === true,
    isPublished: employerData.publicationStatus === "PUBLISHED",
    publicationStatus: employerData.publicationStatus === "PUBLISHED" ? "PUBLISHED" : undefined,
    publicVisibility:
      employerData.publicationStatus === "PUBLISHED" || employerData.directoryVisible === true || employerData.isDirectoryVisible === true
        ? "public"
        : undefined,
    directoryVisible: employerData.directoryVisible === true || employerData.isDirectoryVisible === true,
    isDirectoryVisible: employerData.isDirectoryVisible === true || employerData.directoryVisible === true,
    type: normalizedType,
    ownerType: normalizedType,
    industry: text(employerData.industry) || text(employerData.sector),
    size: text(employerData.companySize) || text(employerData.size),
    socialLinks: {
      linkedin: text(socialLinks.linkedin),
      twitter: text(socialLinks.twitter),
      facebook: text(socialLinks.facebook),
      instagram: text(socialLinks.instagram),
    },
  };

  return Object.fromEntries(Object.entries(next).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "object") return Object.keys(value as UnknownRecord).length > 0;
    return true;
  }));
}

async function deleteDocumentTree(docRef: DocumentReference): Promise<number> {
  const subcollections = await docRef.listCollections();
  let deletedCount = 0;

  for (const subcollection of subcollections) {
    deletedCount += await deleteCollectionTree(subcollection);
  }

  await docRef.delete();
  return deletedCount + 1;
}

async function deleteCollectionTree(
  collectionRef: FirebaseFirestore.CollectionReference,
): Promise<number> {
  let deletedCount = 0;

  while (true) {
    const snapshot = await collectionRef.limit(50).get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      deletedCount += await deleteDocumentTree(doc.ref);
    }
  }

  return deletedCount;
}

async function collectUniqueDocRefs(
  queries: Array<{ key: string; query: Query }>,
): Promise<{
  counts: Record<string, number>;
  refs: DocumentReference[];
}> {
  const snapshots = await Promise.all(
    queries.map(async ({ key, query }) => ({ key, snapshot: await query.get() })),
  );
  const counts: Record<string, number> = {};
  const seenPaths = new Set<string>();
  const refs: DocumentReference[] = [];

  for (const { key, snapshot } of snapshots) {
    counts[key] = snapshot.size;
    for (const doc of snapshot.docs) {
      if (seenPaths.has(doc.ref.path)) continue;
      seenPaths.add(doc.ref.path);
      refs.push(doc.ref);
    }
  }

  return { counts, refs };
}

function shouldResetRole(value: unknown): boolean {
  const normalized = text(value).toLowerCase();
  return normalized === "employer" || normalized === "school" || normalized === "organization";
}

async function unlinkUserFromOrganization(uid: string, orgId: string): Promise<void> {
  if (!adminDb) return;

  const auth = getAdminAuth();
  const userRef = adminDb.collection("users").doc(uid);
  const memberRef = adminDb.collection("members").doc(uid);
  const [userDoc, memberDoc] = await Promise.all([userRef.get(), memberRef.get()]);
  const userData = recordFrom(userDoc.data());
  const memberData = recordFrom(memberDoc.data());

  if (isSuperAdminEmail(text(userData.email))) {
    return;
  }

  const userUpdates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (text(userData.employerId) === orgId) userUpdates.employerId = FieldValue.delete();
  if (text(userData.orgId) === orgId) userUpdates.orgId = FieldValue.delete();
  if (text(userData.orgRole)) userUpdates.orgRole = FieldValue.delete();
  if (text(userData.orgName)) userUpdates.orgName = FieldValue.delete();
  if (shouldResetRole(userData.role)) userUpdates.role = "community";

  const memberUpdates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (text(memberData.orgId) === orgId) memberUpdates.orgId = FieldValue.delete();
  if (text(memberData.orgRole)) memberUpdates.orgRole = FieldValue.delete();
  if (text(memberData.orgName)) memberUpdates.orgName = FieldValue.delete();
  if (shouldResetRole(memberData.role)) memberUpdates.role = "community";

  await Promise.all([
    userDoc.exists ? userRef.set(userUpdates, { merge: true }) : Promise.resolve(),
    memberDoc.exists ? memberRef.set(memberUpdates, { merge: true }) : Promise.resolve(),
  ]);

  try {
    const userRecord = await auth.getUser(uid);
    const nextClaims: Record<string, unknown> = { ...(userRecord.customClaims ?? {}) };

    delete nextClaims.employer;
    if (text(nextClaims.orgId) === orgId) delete nextClaims.orgId;
    if (text(nextClaims.employerId) === orgId) delete nextClaims.employerId;
    if (shouldResetRole(nextClaims.role)) delete nextClaims.role;

    await auth.setCustomUserClaims(uid, Object.keys(nextClaims).length > 0 ? nextClaims : null);
  } catch (error) {
    console.error(`[admin/employers/${orgId}] Failed to clear claims for ${uid}:`, error);
  }
}

function isAuthUserNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "auth/user-not-found"
  );
}

async function disableAuthUser(uid: string): Promise<void> {
  const auth = getAdminAuth();

  try {
    await auth.updateUser(uid, { disabled: true });
    await auth.revokeRefreshTokens(uid);
  } catch (error) {
    if (!isAuthUserNotFoundError(error)) {
      throw error;
    }
  }
}

async function softDeleteLinkedUser(uid: string, orgId: string, adminId: string, deletedAt: string): Promise<void> {
  if (!adminDb) return;
  const userRef = adminDb.collection("users").doc(uid);
  const memberRef = adminDb.collection("members").doc(uid);
  const [userDoc, memberDoc] = await Promise.all([userRef.get(), memberRef.get()]);
  const userData = recordFrom(userDoc.data());

  if (isSuperAdminEmail(text(userData.email))) {
    return;
  }

  await unlinkUserFromOrganization(uid, orgId);

  await Promise.all([
    userDoc.exists
      ? userRef.set({
          status: "deleted",
          deletedAt,
          deletedBy: adminId,
          updatedAt: deletedAt,
        }, { merge: true })
      : Promise.resolve(),
    memberDoc.exists
      ? memberRef.set({
          status: "deleted",
          deletedAt,
          deletedBy: adminId,
          updatedAt: deletedAt,
        }, { merge: true })
      : Promise.resolve(),
  ]);

  await disableAuthUser(uid);
}

async function updateDocumentRefsInChunks(
  refs: DocumentReference[],
  getPatch: (ref: DocumentReference) => Record<string, unknown> | null,
): Promise<void> {
  if (!adminDb || refs.length === 0) return;

  for (let index = 0; index < refs.length; index += 400) {
    const chunk = refs.slice(index, index + 400);
    const batch = adminDb.batch();

    for (const ref of chunk) {
      const patch = getPatch(ref);
      if (!patch) continue;
      batch.set(ref, patch, { merge: true });
    }

    await batch.commit();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { orgId } = await params;

  try {
    const employerDoc = await adminDb.collection("employers").doc(orgId).get();
    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    const viewerIsSuperAdmin = isSuperAdminEmail(
      auth.viewerEmail ?? auth.decodedToken.email ?? null,
    );

    const rawEmployer = { id: employerDoc.id, ...employerDoc.data() } as Record<string, unknown>;
    const normalizedEmployer = normalizeAdminEmployerRow(rawEmployer, employerDoc.id);
    const employer = {
      ...rawEmployer,
      ...normalizedEmployer,
      name: normalizedEmployer.displayName,
      logo:
        (typeof rawEmployer.logoUrl === "string" && rawEmployer.logoUrl) ||
        (typeof rawEmployer.logo === "string" && rawEmployer.logo) ||
        null,
    };

    // Get team members
    const usersSnap = await adminDb
      .collection("users")
      .where("employerId", "==", orgId)
      .get();
    const team = usersSnap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || doc.data().displayName || "Unknown",
      email: doc.data().email || "",
      role: doc.data().orgRole || "member",
      avatar: doc.data().photoURL || null,
    }));

    // Count jobs
    const jobsSnap = await adminDb
      .collection("jobs")
      .where("employerId", "==", orgId)
      .get();
    const jobCount = jobsSnap.size;

    // Count applications across all jobs
    let applicationCount = 0;
    for (const jobDoc of jobsSnap.docs) {
      const appsSnap = await adminDb
        .collection("applications")
        .where("jobId", "==", jobDoc.id)
        .get();
      applicationCount += appsSnap.size;
    }

    // Get action history
    const historySnap = await adminDb
      .collection("employers")
      .doc(orgId)
      .collection("actionHistory")
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();
    const actionHistory = historySnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      employer,
      team,
      stats: {
        jobsPosted: jobCount,
        applicationsReceived: applicationCount,
        profileViews: (employerDoc.data() as Record<string, unknown>)?.profileViews || 0,
      },
      actionHistory,
      capabilities: {
        canAssignSubscription: viewerIsSuperAdmin,
        canDelete: viewerIsSuperAdmin,
      },
    });
  } catch (error) {
    console.error("Error fetching employer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { orgId } = await params;
  const body = recordFrom(await request.json());

  try {
    const employerRef = adminDb.collection("employers").doc(orgId);
    const organizationRef = adminDb.collection("organizations").doc(orgId);
    const viewerIsSuperAdmin = isSuperAdminEmail(
      auth.viewerEmail ?? auth.decodedToken.email ?? null,
    );

    if (text(body.action).toLowerCase() === "softdelete") {
      if (!viewerIsSuperAdmin) {
        return NextResponse.json(
          { error: "Super admin access required" },
          { status: 403 },
        );
      }

      const confirmOrgId = text(body.confirmOrgId);
      const linkedUserPolicy = text(body.linkedUserPolicy).toLowerCase() as LinkedUserPolicy;

      if (!confirmOrgId || confirmOrgId !== orgId) {
        return NextResponse.json(
          { error: "confirmOrgId must match the organization being deleted" },
          { status: 400 },
        );
      }

      if (linkedUserPolicy !== "unlink" && linkedUserPolicy !== "delete") {
        return NextResponse.json(
          { error: "linkedUserPolicy must be 'unlink' or 'delete'" },
          { status: 400 },
        );
      }

      const [employerDoc, organizationDoc] = await Promise.all([
        employerRef.get(),
        organizationRef.get(),
      ]);

      if (!employerDoc.exists && !organizationDoc.exists) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }

      const employerData = recordFrom(employerDoc.data());
      const organizationData = recordFrom(organizationDoc.data());
      const linkedUsers = new Set<string>();

      [
        text(employerData.uid),
        text(organizationData.uid),
        text(employerData.ownerId),
        text(organizationData.ownerId),
      ]
        .filter(Boolean)
        .forEach((uid) => linkedUsers.add(uid));

      const [linkedUsersByEmployerId, linkedUsersByOrgId, linkedMembers] = await Promise.all([
        adminDb.collection("users").where("employerId", "==", orgId).get(),
        adminDb.collection("users").where("orgId", "==", orgId).get(),
        adminDb.collection("members").where("orgId", "==", orgId).get(),
      ]);

      linkedUsersByEmployerId.docs.forEach((doc) => linkedUsers.add(doc.id));
      linkedUsersByOrgId.docs.forEach((doc) => linkedUsers.add(doc.id));
      linkedMembers.docs.forEach((doc) => linkedUsers.add(doc.id));

      const relatedContent = await collectUniqueDocRefs([
        { key: "jobsByEmployerId", query: adminDb.collection("jobs").where("employerId", "==", orgId) },
        { key: "jobsByOrgId", query: adminDb.collection("jobs").where("orgId", "==", orgId) },
        { key: "postsByOrgId", query: adminDb.collection("posts").where("orgId", "==", orgId) },
        { key: "postsByEmployerId", query: adminDb.collection("posts").where("employerId", "==", orgId) },
        { key: "eventsByOrgId", query: adminDb.collection("events").where("orgId", "==", orgId) },
        { key: "eventsByOrganizationId", query: adminDb.collection("events").where("organizationId", "==", orgId) },
        { key: "eventsByEmployerId", query: adminDb.collection("events").where("employerId", "==", orgId) },
        { key: "scholarshipsByOrgId", query: adminDb.collection("scholarships").where("orgId", "==", orgId) },
        { key: "scholarshipsByEmployerId", query: adminDb.collection("scholarships").where("employerId", "==", orgId) },
      ]);

      const deletedAt = new Date().toISOString();
      const deletionMetadata = buildOrganizationSoftDeleteMetadata(
        auth.decodedToken.uid,
        deletedAt,
      );

      await Promise.all([
        employerRef.set(deletionMetadata, { merge: true }),
        organizationRef.set(deletionMetadata, { merge: true }),
      ]);

      await updateDocumentRefsInChunks(
        relatedContent.refs,
        (ref) => buildSoftDeleteContentPatch(ref.parent.id, deletedAt),
      );

      for (const uid of linkedUsers) {
        if (linkedUserPolicy === "delete") {
          await softDeleteLinkedUser(uid, orgId, auth.decodedToken.uid, deletedAt);
        } else {
          await unlinkUserFromOrganization(uid, orgId);
        }
      }

      await employerRef.collection("actionHistory").add({
        action: "soft_delete",
        adminId: auth.decodedToken.uid,
        timestamp: deletedAt,
        details: {
          confirmOrgId,
          linkedUserPolicy,
          linkedUsers: Array.from(linkedUsers),
          linkedContent: relatedContent.counts,
        },
      });

      return NextResponse.json({
        success: true,
        orgId,
        linkedUserPolicy,
        linkedUsers: Array.from(linkedUsers),
        linkedContent: relatedContent.counts,
        deletedAt,
      });
    }

    const updateData: Record<string, unknown> = {};
    const organizationUpdateData: Record<string, unknown> = {};

    if (body.verified !== undefined) {
      updateData.verified = body.verified;
      updateData.verificationStatus = body.verified ? "verified" : "unverified";
      organizationUpdateData.verified = body.verified;
      organizationUpdateData.verificationStatus = body.verified ? "verified" : "unverified";
    }
    if (body.disabled !== undefined) {
      updateData.disabled = body.disabled;
      updateData.status = body.disabled ? "disabled" : "active";
      organizationUpdateData.disabled = body.disabled;
      organizationUpdateData.status = body.disabled ? "disabled" : "approved";
    }
    if (body.plan) {
      updateData.plan = body.plan;
      organizationUpdateData.plan = body.plan;
    }
    if (body.syncOrganizationProfile === true) {
      const employerDoc = await employerRef.get();
      if (!employerDoc.exists) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }
      Object.assign(organizationUpdateData, buildOrganizationMirrorFromEmployer(recordFrom(employerDoc.data())));
    }

    const updatedAt = new Date().toISOString();
    updateData.updatedAt = updatedAt;
    organizationUpdateData.updatedAt = updatedAt;

    await Promise.all([
      Object.keys(updateData).length > 1
        ? employerRef.update(updateData)
        : Promise.resolve(),
      organizationRef.set(organizationUpdateData, { merge: true }),
    ]);

    // Log action
    await adminDb
      .collection("employers")
      .doc(orgId)
      .collection("actionHistory")
      .add({
        action: Object.keys(body).join(", "),
        details: body,
        adminId: auth.decodedToken.uid,
        timestamp: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating employer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await verifySuperAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { orgId } = await params;
  const body = await request.json().catch(() => ({}));
  const confirmOrgId = text(recordFrom(body).confirmOrgId);
  const deleteAuthUser = recordFrom(body).deleteAuthUser === true;
  const force = recordFrom(body).force === true;

  if (!confirmOrgId || confirmOrgId !== orgId) {
    return NextResponse.json(
      { error: "confirmOrgId must match the organization being deleted" },
      { status: 400 },
    );
  }

  try {
    const employerRef = adminDb.collection("employers").doc(orgId);
    const organizationRef = adminDb.collection("organizations").doc(orgId);
    const [employerDoc, organizationDoc] = await Promise.all([
      employerRef.get(),
      organizationRef.get(),
    ]);

    if (!employerDoc.exists && !organizationDoc.exists) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const employerData = recordFrom(employerDoc.data());
    const organizationData = recordFrom(organizationDoc.data());

    const ownerIds = new Set<string>();
    [
      text(employerData.uid),
      text(organizationData.uid),
      text(employerData.ownerId),
      text(organizationData.ownerId),
    ]
      .filter(Boolean)
      .forEach((uid) => ownerIds.add(uid));

    const [linkedUsersByEmployerId, linkedUsersByOrgId, linkedMembers] = await Promise.all([
      adminDb.collection("users").where("employerId", "==", orgId).get(),
      adminDb.collection("users").where("orgId", "==", orgId).get(),
      adminDb.collection("members").where("orgId", "==", orgId).get(),
    ]);

    linkedUsersByEmployerId.docs.forEach((doc) => ownerIds.add(doc.id));
    linkedUsersByOrgId.docs.forEach((doc) => ownerIds.add(doc.id));
    linkedMembers.docs.forEach((doc) => ownerIds.add(doc.id));

    const relatedContent = await collectUniqueDocRefs([
      { key: "jobsByEmployerId", query: adminDb.collection("jobs").where("employerId", "==", orgId) },
      { key: "jobsByOrgId", query: adminDb.collection("jobs").where("orgId", "==", orgId) },
      { key: "postsByOrgId", query: adminDb.collection("posts").where("orgId", "==", orgId) },
      { key: "subscriptionsByOrgId", query: adminDb.collection("subscriptions").where("orgId", "==", orgId) },
      { key: "eventsByOrgId", query: adminDb.collection("events").where("orgId", "==", orgId) },
      { key: "eventsByOrganizationId", query: adminDb.collection("events").where("organizationId", "==", orgId) },
      { key: "eventsByEmployerId", query: adminDb.collection("events").where("employerId", "==", orgId) },
      { key: "scholarshipsByOrgId", query: adminDb.collection("scholarships").where("orgId", "==", orgId) },
      { key: "scholarshipsByEmployerId", query: adminDb.collection("scholarships").where("employerId", "==", orgId) },
      { key: "studentInquiriesBySchoolId", query: adminDb.collection("student_inquiries").where("schoolId", "==", orgId) },
      { key: "studentInquiriesByOrgId", query: adminDb.collection("student_inquiries").where("orgId", "==", orgId) },
      { key: "studentInquiriesByOrganizationId", query: adminDb.collection("student_inquiries").where("organizationId", "==", orgId) },
      { key: "studentInquiriesByEmployerId", query: adminDb.collection("student_inquiries").where("employerId", "==", orgId) },
      { key: "schoolInquiriesBySchoolId", query: adminDb.collection("school_inquiries").where("schoolId", "==", orgId) },
      { key: "schoolInquiriesByOrgId", query: adminDb.collection("school_inquiries").where("orgId", "==", orgId) },
      { key: "schoolInquiriesByOrganizationId", query: adminDb.collection("school_inquiries").where("organizationId", "==", orgId) },
      { key: "schoolInquiriesByEmployerId", query: adminDb.collection("school_inquiries").where("employerId", "==", orgId) },
    ]);

    const relatedDocumentCount = relatedContent.refs.length;
    if (!force && relatedDocumentCount > 0) {
      return NextResponse.json(
        {
          error: "Organization has linked content. Re-run with force=true to purge it.",
          linkedContent: relatedContent.counts,
          linkedUsers: Array.from(ownerIds),
        },
        { status: 409 },
      );
    }

    let deletedDocumentCount = 0;

    for (const ref of relatedContent.refs) {
      deletedDocumentCount += await deleteDocumentTree(ref);
    }

    if (organizationDoc.exists) {
      deletedDocumentCount += await deleteDocumentTree(organizationRef);
    }
    if (employerDoc.exists) {
      deletedDocumentCount += await deleteDocumentTree(employerRef);
    }

    for (const uid of ownerIds) {
      await unlinkUserFromOrganization(uid, orgId);
    }

    if (deleteAuthUser) {
      const authService = getAdminAuth();
      for (const uid of ownerIds) {
        try {
          const userDoc = await adminDb.collection("users").doc(uid).get();
          if (isSuperAdminEmail(userDoc.data()?.email)) {
            continue;
          }
          await authService.deleteUser(uid);
        } catch (error) {
          console.error(`[admin/employers/${orgId}] Failed to delete auth user ${uid}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      orgId,
      linkedUsers: Array.from(ownerIds),
      linkedContent: relatedContent.counts,
      deletedDocumentCount,
      deletedAuthUsers: deleteAuthUser ? Array.from(ownerIds) : [],
    });
  } catch (error) {
    console.error(`Error deleting employer ${orgId}:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
