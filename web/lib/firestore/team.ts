// Team management operations for employer organizations
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  db,
  employerCollection,
  teamInvitationsCollection,
} from "./shared";
import type {
  TeamMember,
  TeamInvitation,
  TeamRole,
  TeamInvitationStatus,
  EmployerProfile,
} from "@/lib/types";

// Generate a secure random token for invitations
function generateInvitationToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ============================================
// Team Member Operations (stored in employer doc)
// ============================================

export async function getTeamMembers(employerId: string): Promise<TeamMember[]> {
  if (!db) return [];

  const employerRef = doc(db, employerCollection, employerId);
  const employerDoc = await getDoc(employerRef);

  if (!employerDoc.exists()) return [];

  const data = employerDoc.data() as EmployerProfile;
  return data.teamMembers || [];
}

export async function addTeamMember(
  employerId: string,
  member: Omit<TeamMember, "addedAt">
): Promise<void> {
  if (!db) throw new Error("Database not available");

  const employerRef = doc(db, employerCollection, employerId);

  const teamMember: TeamMember = {
    ...member,
    addedAt: serverTimestamp() as any,
  };

  await updateDoc(employerRef, {
    teamMembers: arrayUnion(teamMember),
    updatedAt: serverTimestamp(),
  });
}

export async function removeTeamMember(
  employerId: string,
  memberId: string
): Promise<void> {
  if (!db) throw new Error("Database not available");

  // First get the current team members
  const members = await getTeamMembers(employerId);
  const memberToRemove = members.find((m) => m.id === memberId);

  if (!memberToRemove) {
    throw new Error("Team member not found");
  }

  const employerRef = doc(db, employerCollection, employerId);

  // Remove the specific member
  await updateDoc(employerRef, {
    teamMembers: arrayRemove(memberToRemove),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTeamMemberRole(
  employerId: string,
  memberId: string,
  newRole: TeamRole
): Promise<void> {
  if (!db) throw new Error("Database not available");

  // Get current members
  const members = await getTeamMembers(employerId);
  const memberIndex = members.findIndex((m) => m.id === memberId);

  if (memberIndex === -1) {
    throw new Error("Team member not found");
  }

  // Update the role
  const updatedMembers = [...members];
  updatedMembers[memberIndex] = {
    ...updatedMembers[memberIndex],
    role: newRole,
  };

  const employerRef = doc(db, employerCollection, employerId);
  await updateDoc(employerRef, {
    teamMembers: updatedMembers,
    updatedAt: serverTimestamp(),
  });
}

// Check if a user is a team member of an employer
export async function isUserTeamMember(
  employerId: string,
  userId: string
): Promise<{ isMember: boolean; role?: TeamRole }> {
  if (!db) return { isMember: false };

  const employerRef = doc(db, employerCollection, employerId);
  const employerDoc = await getDoc(employerRef);

  if (!employerDoc.exists()) return { isMember: false };

  const data = employerDoc.data() as EmployerProfile;

  // Check if user is the owner
  if (data.userId === userId) {
    return { isMember: true, role: "admin" };
  }

  // Check team members
  const member = data.teamMembers?.find((m) => m.id === userId);
  if (member) {
    return { isMember: true, role: member.role };
  }

  return { isMember: false };
}

// Get employer ID for a team member (check invitations they've accepted)
export async function getEmployerIdForUser(
  userId: string,
  userEmail: string
): Promise<string | null> {
  if (!db) return null;

  // First check if user is an employer owner
  const ownerQuery = query(
    collection(db, employerCollection),
    where("userId", "==", userId)
  );
  const ownerDocs = await getDocs(ownerQuery);
  if (!ownerDocs.empty) {
    return ownerDocs.docs[0].id;
  }

  // Check accepted invitations
  const inviteQuery = query(
    collection(db, teamInvitationsCollection),
    where("invitedEmail", "==", userEmail),
    where("status", "==", "accepted")
  );
  const inviteDocs = await getDocs(inviteQuery);
  if (!inviteDocs.empty) {
    return inviteDocs.docs[0].data().employerId;
  }

  return null;
}

// ============================================
// Team Invitation Operations
// ============================================

export async function createInvitation(
  employerId: string,
  organizationName: string,
  invitedEmail: string,
  role: TeamRole,
  invitedBy: string,
  invitedByName?: string
): Promise<TeamInvitation> {
  if (!db) throw new Error("Database not available");

  // Check if invitation already exists
  const existingQuery = query(
    collection(db, teamInvitationsCollection),
    where("employerId", "==", employerId),
    where("invitedEmail", "==", invitedEmail.toLowerCase()),
    where("status", "==", "pending")
  );
  const existing = await getDocs(existingQuery);
  if (!existing.empty) {
    throw new Error("An invitation is already pending for this email");
  }

  // Check if already a team member
  const members = await getTeamMembers(employerId);
  if (members.some((m) => m.email.toLowerCase() === invitedEmail.toLowerCase())) {
    throw new Error("This user is already a team member");
  }

  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

  const invitationData = {
    employerId,
    organizationName,
    invitedEmail: invitedEmail.toLowerCase(),
    invitedBy,
    invitedByName: invitedByName || organizationName || "Team Admin",
    role,
    status: "pending" as TeamInvitationStatus,
    token,
    expiresAt,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, teamInvitationsCollection),
    invitationData
  );

  return {
    id: docRef.id,
    ...invitationData,
    expiresAt: null, // Will be actual timestamp in DB
    createdAt: null,
  };
}

export async function getInvitation(
  invitationId: string
): Promise<TeamInvitation | null> {
  if (!db) return null;

  const inviteRef = doc(db, teamInvitationsCollection, invitationId);
  const inviteDoc = await getDoc(inviteRef);

  if (!inviteDoc.exists()) return null;

  return { id: inviteDoc.id, ...inviteDoc.data() } as TeamInvitation;
}

export async function getInvitationByToken(
  token: string
): Promise<TeamInvitation | null> {
  if (!db) return null;

  const q = query(
    collection(db, teamInvitationsCollection),
    where("token", "==", token)
  );
  const docs = await getDocs(q);

  if (docs.empty) return null;

  const doc = docs.docs[0];
  return { id: doc.id, ...doc.data() } as TeamInvitation;
}

export async function getPendingInvitationsForEmail(
  email: string
): Promise<TeamInvitation[]> {
  if (!db) return [];

  const q = query(
    collection(db, teamInvitationsCollection),
    where("invitedEmail", "==", email.toLowerCase()),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  const docs = await getDocs(q);
  return docs.docs.map((d) => ({ id: d.id, ...d.data() } as TeamInvitation));
}

export async function getInvitationsForEmployer(
  employerId: string
): Promise<TeamInvitation[]> {
  if (!db) return [];

  const q = query(
    collection(db, teamInvitationsCollection),
    where("employerId", "==", employerId),
    orderBy("createdAt", "desc")
  );

  const docs = await getDocs(q);
  return docs.docs.map((d) => ({ id: d.id, ...d.data() } as TeamInvitation));
}

export async function acceptInvitation(
  invitationId: string,
  userId: string,
  userEmail: string,
  displayName?: string
): Promise<void> {
  if (!db) throw new Error("Database not available");

  const invitation = await getInvitation(invitationId);
  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw new Error("Invitation is no longer valid");
  }

  if (invitation.invitedEmail.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error("This invitation is for a different email address");
  }

  // Check expiration
  const expiresAt = invitation.expiresAt;
  if (expiresAt) {
    const expirationDate =
      typeof expiresAt === "object" && "toDate" in expiresAt
        ? (expiresAt as { toDate: () => Date }).toDate()
        : new Date(expiresAt as unknown as number);
    if (expirationDate < new Date()) {
      await updateDoc(doc(db, teamInvitationsCollection, invitationId), {
        status: "expired",
      });
      throw new Error("Invitation has expired");
    }
  }

  // Add user as team member
  await addTeamMember(invitation.employerId, {
    id: userId,
    email: userEmail,
    displayName,
    role: invitation.role,
    addedBy: invitation.invitedBy,
  });

  // Update invitation status
  await updateDoc(doc(db, teamInvitationsCollection, invitationId), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
  });
}

export async function declineInvitation(invitationId: string): Promise<void> {
  if (!db) throw new Error("Database not available");

  const inviteRef = doc(db, teamInvitationsCollection, invitationId);
  await updateDoc(inviteRef, {
    status: "declined",
  });
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  if (!db) throw new Error("Database not available");

  const inviteRef = doc(db, teamInvitationsCollection, invitationId);
  await deleteDoc(inviteRef);
}

export async function resendInvitation(
  invitationId: string
): Promise<TeamInvitation> {
  if (!db) throw new Error("Database not available");

  const invitation = await getInvitation(invitationId);
  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw new Error("Can only resend pending invitations");
  }

  // Generate new token and extend expiration
  const newToken = generateInvitationToken();
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  const inviteRef = doc(db, teamInvitationsCollection, invitationId);
  await updateDoc(inviteRef, {
    token: newToken,
    expiresAt: newExpiresAt,
  });

  return {
    ...invitation,
    token: newToken,
    expiresAt: null, // Will be actual timestamp in DB
  };
}
