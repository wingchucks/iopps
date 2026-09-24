import type {Firestore,Transaction} from 'firebase-admin/firestore';
import type {PublicationReader} from './paid-job-publication-reader';
/** Reads participate in the caller's transaction; this adapter never writes. */
export function firestorePublicationReader(db:Firestore,tx:Transaction):PublicationReader {
  return {
    async getDocument(collection,id) {
      const doc=await tx.get(db.collection(collection).doc(id));
      return doc.exists ? {id:doc.id,data:doc.data()!,version:doc.updateTime?.toDate().toISOString()} : null;
    },
    async queryExact(collection,field,value,limit) {
      const snapshot=await tx.get(db.collection(collection).where(field,'==',value).limit(limit));
      return snapshot.docs.map(doc=>({id:doc.id,data:doc.data(),version:doc.updateTime?.toDate().toISOString()}));
    },
  };
}
