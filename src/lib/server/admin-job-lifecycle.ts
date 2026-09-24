import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {preparePaidPublication} from './paid-job-publication-reader';
import {firestorePublicationReader} from './paid-job-publication-firestore';
import {PublicationError} from './paid-job-publication';

/** Admin privilege does not silently grant a paid placement. Grants use existing explicit billing administration. */
export async function activateAdminJob(db: Firestore, jobId: string, options: {feature?:boolean;restore?:boolean} = {}): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    try { return await activateAdminJobOnce(db, jobId, options); }
    catch (error) {
      const failure = error as { code?: number; message?: string };
      if (attempt >= 2 || failure?.code !== 3 || !failure.message?.includes('Transaction is invalid or closed.')) throw error;
    }
  }
}

async function activateAdminJobOnce(db: Firestore, jobId: string, options: {feature?:boolean;restore?:boolean}): Promise<string | null> {
  const publicationNow = new Date();
  return db.runTransaction(async tx => {
    const jobRef = db.collection('jobs').doc(jobId);
    const job = await tx.get(jobRef);
    if (!job.exists) return 'Job not found';
    const data = job.data()!;
    for (const field of ['featured', 'featuredCreditConsumed']) {
      if (data[field] !== undefined && typeof data[field] !== 'boolean') return 'Invalid featured placement record';
    }
    if (data.status === 'deleted' || data.deletedAt) return 'Deleted jobs cannot be activated';
    const archiveRef=db.collection('archivedContent').doc(jobId);
    if(options.restore) {
      const archive=await tx.get(archiveRef);
      if(!archive.exists || archive.data()?.originalCollection!=='jobs')return 'Job archive identity requires review';
    }
    const mirrorRef = db.collection('posts').doc(jobId);
    const mirror = await tx.get(mirrorRef);
    if (mirror.exists && mirror.data()?.type === 'job') {
      const other = mirror.data()!;
      for (const field of ['featured','featuredCreditConsumed']) {
        if ((other[field] !== undefined && typeof other[field] !== 'boolean') || (other[field] === true) !== (data[field] === true)) return 'Conflicting job placement mirrors require review';
      }
    }
    const owner = data.employerId || data.orgId;
    const organizationId = data.orgId || data.organizationId || owner;
    if (typeof owner !== 'string' || typeof organizationId !== 'string') return 'Job ownership requires review';
    if (mirror.exists && mirror.data()?.type === 'job') {
      const other=mirror.data()!;
      if (![owner,organizationId].includes(other.employerId || other.orgId)) return 'Conflicting job ownership requires review';
    }
    let paid;
    try {
      paid=await preparePaidPublication(firestorePublicationReader(db,tx),{
        employerId:owner,organizationId,jobId,current:data,status:options.feature && data.status!=='active' ? 'draft' : 'active',featured:options.feature || data.featured===true,
        durationDays:data.listingDurationDays,now:publicationNow,
      });
    } catch(error) { if(error instanceof PublicationError)return error.message;throw error; }
    tx.set(db.collection('employers').doc(owner),{...paid.employerPatch,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    const patch: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
      ...(options.feature ? {featured:true} : {active:true,status:'active'}),
      ...(options.restore ? {archived:false} : {}),updatedAt:FieldValue.serverTimestamp(),...paid.jobPatch,
    };
    tx.update(jobRef,patch);
    if (mirror.exists && mirror.data()?.type === 'job') tx.update(mirrorRef,patch);
    if(options.restore)tx.delete(archiveRef);
    return null;
  });
}
