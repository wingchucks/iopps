import type {Firestore,DocumentSnapshot} from 'firebase-admin/firestore';
import {CLEANUP,CleanupConflict,type CleanupPort,type CleanupDoc} from './hermes-job-cleanup.ts';
const targets=new Set([...CLEANUP.pairs.flat(),...CLEANUP.stale]);const oldTargets=new Set([...CLEANUP.pairs.map(p=>p[0]),...CLEANUP.stale]);
function readable(path:string){const [collection,id,...rest]=path.split('/');if(rest.length||!id||! /^[A-Za-z0-9_-]{1,120}$/.test(id))throw new CleanupConflict('Invalid cleanup path');if((collection==='jobs'||collection==='posts')&&targets.has(id))return;if(collection==='employers'&&(id===CLEANUP.oldEmployer||id===CLEANUP.newEmployer))return;if(['rssFeeds','jobCleanupReviews','jobCleanupBackups','jobCleanupAudits','jobCleanupReceipts'].includes(collection))return;if((collection==='jobAliases'||collection==='jobCleanupGuards')&&targets.has(id))return;if(collection==='jobCleanupSources'&&/^[a-f0-9]{64}$/.test(id))return;throw new CleanupConflict('Path outside cleanup scope');}
function writable(path:string,create:boolean){readable(path);const [c,id]=path.split('/');if(['jobs','posts'].includes(c)&&oldTargets.has(id)&&!create)return;if(c==='jobCleanupSources'||(['jobAliases','jobCleanupGuards'].includes(c)&&oldTargets.has(id)))return;if(create&&['jobCleanupReviews','jobCleanupBackups','jobCleanupAudits','jobCleanupReceipts'].includes(c))return;throw new CleanupConflict('Write outside cleanup scope');}
function document(snapshot:DocumentSnapshot):CleanupDoc|null {if(!snapshot.exists)return null;const t=snapshot.updateTime;if(!t)throw new CleanupConflict('Native updateTime required');return {path:snapshot.ref.path,version:`${t.seconds}:${t.nanoseconds}`,data:snapshot.data()!};}
function exactQuery(db:Firestore,c:string,f:string,v:string,limit:number){if(!targets.has(v)||limit!==101||!((c==='applications'&&f==='jobId')||(c==='saved_items'&&f==='postId')||(c==='savedJobs'&&f==='jobId')))throw new CleanupConflict('Query outside scoped references');return db.collection(c).where(f,'==',v).limit(limit);}
/** Narrow native port: no deletes, no merges, no arbitrary application/ownership writes. */
export function createNativeJobCleanupPort(db:Firestore):CleanupPort {
 return {
  async read(path){readable(path);return document((await db.getAll(db.doc(path)))[0]);},
  async query(c,f,v,limit){return (await exactQuery(db,c,f,v,limit).get()).docs.map(d=>document(d)!);},
  async transaction(fn){return db.runTransaction(async tx=>{let writing=false;const readPhase=()=>{if(writing)throw new CleanupConflict('Cleanup requires all reads before writes');};return fn({
   async read(path){readPhase();readable(path);return document(await tx.get(db.doc(path)));},
   async query(c,f,v,limit){readPhase();return (await tx.get(exactQuery(db,c,f,v,limit))).docs.map(d=>document(d)!);},
   create(path,data){writable(path,true);writing=true;tx.create(db.doc(path),data);},
   replace(path,data){writable(path,false);writing=true;tx.set(db.doc(path),data);},
  });});},
 };
}
