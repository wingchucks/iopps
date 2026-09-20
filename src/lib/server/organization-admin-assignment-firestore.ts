import type { Firestore, Transaction, DocumentSnapshot, Query } from "firebase-admin/firestore";
import type { AssignmentDesired, AssignmentDocument, AssignmentState, AssignmentStore } from "./organization-admin-assignment.ts";
import { AssignmentError } from "./organization-admin-assignment.ts";

interface IdentityAuth {
  getUserByEmail(email: string): Promise<{uid:string;email?:string;disabled:boolean;customClaims?:Record<string,unknown>;emailVerified?:boolean;tokensValidAfterTime?:string}>;
}
const normalize = (email: unknown) => typeof email === "string" ? email.trim().toLowerCase() : "";
function document(snap: DocumentSnapshot): AssignmentDocument | null {
  return snap.exists ? {version:`${snap.updateTime!.seconds}:${snap.updateTime!.nanoseconds}`,data:snap.data()!} : null;
}

/** Uses the existing same-ID mirror contract. No name, email-domain or owner-ID inference. */
export function createAssignmentStore(db: Firestore, auth: IdentityAuth, desired: AssignmentDesired): AssignmentStore {
  async function read(tx: Transaction): Promise<AssignmentState> {
    let identity: Awaited<ReturnType<IdentityAuth["getUserByEmail"]>>;
    try { identity = await auth.getUserByEmail(desired.email); }
    catch (error) {
      if ((error as {code?:string})?.code === "auth/user-not-found") throw new AssignmentError("Existing Auth user not found");
      throw error;
    }
    if (!identity.email) throw new AssignmentError("Auth user has no email");
    const uid = identity.uid;
    const refs = [db.doc(`users/${uid}`),db.doc(`members/${uid}`),db.doc(`employers/${desired.orgId}`),db.doc(`organizations/${desired.orgId}`)];
    const [user,member,employer,organization] = (await tx.getAll(...refs)).map(document);
    if (!user || !employer || !organization) throw new AssignmentError("Existing user and both exact organization mirrors are required");

    // Legacy email fields have no normalized unique index. A bounded complete scan is
    // necessary to reject case variants; truncation must never imply uniqueness.
    const identityIds = new Set<string>();
    for (const collection of ["users","members"]) {
      const snapshot = await tx.get(db.collection(collection).select("email").limit(5001));
      if (snapshot.size > 5000) throw new AssignmentError("Identity scan bound exceeded; canonical identity reconciliation required");
      for (const doc of snapshot.docs) if (normalize(doc.data().email) === normalize(desired.email)) identityIds.add(doc.id);
    }
    const mirrorIds = new Set([desired.orgId]);
    for (const collection of ["employers","organizations"]) {
      const queries: Query[] = ["orgId","organizationId","employerId"].map(field => db.collection(collection).where(field,"==",desired.orgId).limit(2));
      queries.push(...["uid","ownerId"].map(field => db.collection(collection).where(field,"==",uid).limit(2)));
      for (const query of queries) for (const doc of (await tx.get(query)).docs) mirrorIds.add(doc.id);
      if (uid !== desired.orgId && (await tx.get(db.doc(`${collection}/${uid}`))).exists) throw new AssignmentError("User already owns another organization record");
    }
    const peers: Record<string,unknown> = {};
    for (const [collection,field] of [["users","employerId"],["users","orgId"],["members","orgId"]]) {
      const snapshot = await tx.get(db.collection(collection).where(field,"==",desired.orgId).limit(501));
      if (snapshot.size > 500) throw new AssignmentError("Team review bound exceeded");
      for (const doc of snapshot.docs) if (doc.id !== uid) peers[doc.ref.path] = document(doc);
    }
    return {auth:{uid,email:identity.email,disabled:identity.disabled,customClaims:identity.customClaims ?? {},emailVerified:identity.emailVerified ?? false,tokensValidAfterTime:identity.tokensValidAfterTime ?? null},user,member,employer,organization,identityIds:[...identityIds].sort(),mirrorIds:[...mirrorIds].sort(),peers};
  }
  return {
    read: () => db.runTransaction(tx => read(tx),{readOnly:true}),
    readReceipt: async id => (await db.doc(`organizationAdminAssignments/${id}`).get()).data() ?? null,
    transact: (id,callback) => db.runTransaction(async tx => {
      const receiptRef = db.doc(`organizationAdminAssignments/${id}`);
      const receipt = await tx.get(receiptRef);
      const state = await read(tx);
      return callback(state,receipt.exists ? receipt.data() : null,async (patches,nextReceipt) => {
        // ALL reads, identity checks and review verification precede these writes.
        const refs = {user:db.doc(`users/${state.auth.uid}`),member:db.doc(`members/${state.auth.uid}`),employer:db.doc(`employers/${desired.orgId}`),organization:db.doc(`organizations/${desired.orgId}`)};
        for (const key of ["user","member","employer","organization"] as const) {
          if (!patches[key]) continue;
          if (key === "member" && !state.member) tx.create(refs[key],patches[key]);
          else tx.update(refs[key],patches[key]);
        }
        // Receipt is also the sanitized audit: IDs, intent and digests, no email/token/claims.
        tx.create(receiptRef,nextReceipt);
      });
    }),
  };
}
