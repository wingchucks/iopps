// OFFLINE ONLY: generate a deterministic review plan from a saved public audit.
// Intentionally contains no Firebase/HTTP client and no apply mode.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [input,out]=process.argv.slice(2);assert.ok(input&&out,'Usage: node script audit.json output-directory');
const bytes=fs.readFileSync(input),audit=JSON.parse(bytes),byId=new Map(audit.records.map(row=>[row.id,row]));
const pairs=[['RsrdlIr8KA2Rn0DgUUSW','8hlV1frEldGecf3IRnfN'],['2j392LWYj5Rn2xP36BKT','UHXmZQOqHfBLsKIXVLzI'],['70zbVfpvg7mxpXdCFKPn','KhQHz3SzVwMUZLxEGpWg'],['0i8MEndHFvaXOcsY8m82','2D23E7eUULUWVPwLeIQs'],['b8B0MjhhK58CoClyEWiO','4K0FQHtnAPJZMuERH4M0'],['1nekmP9eqMWXIJ6JrXgk','IJilZ6vMLNj8e4Z7RsIJ'],['msJO0CSIaCD1brLcVW55','0ucJ0rmx6cowH7SqyaEt']];
const hash=value=>createHash('sha256').update(value).digest('hex');
const retirements=pairs.map(([oldId,canonicalId])=>{
 const old=byId.get(oldId),canonical=byId.get(canonicalId);assert.ok(old&&canonical);assert.equal(old.externalUrl,canonical.externalUrl);assert.equal(old.sourceIdDerivedFromPublicUrl,canonical.sourceIdDerivedFromPublicUrl);assert.ok(old.slug&&canonical.slug);
 return {oldId,canonicalId,title:old.title,sourceUrl:old.externalUrl,sourceRequisition:old.sourceIdDerivedFromPublicUrl,publicSnapshotHashes:{old:hash(JSON.stringify(old)),canonical:hash(JSON.stringify(canonical))},ownership:{old:old.employerId,canonical:canonical.employerId,approved:false},proposedOldPatch:{active:false,status:'deleted',duplicateOf:canonicalId},proposedRedirect:{source:'/jobs/'+old.slug,destination:'/jobs/'+canonical.slug,statusCode:301},requiredMirrors:['jobs/'+oldId,'posts/'+oldId],preserve:['all original document fields/descriptions/dates','saved_items postId and user ownership','applications immutable jobId/employerId/snapshot','archived application objects'],applyAllowed:false};
});
const staleIds=['Kx8XAVkiS7T6YGTdf4Kd','TEIAjYDMwnorXK4KVgDN','K2BP8gTOzkzFldnoMe8r','HcGf144zPqNSCAMVgeHm'];
const stale=staleIds.map(id=>{const record=byId.get(id);assert.ok(record);return{id,title:record.title,sourceUrl:record.externalUrl,classification:'different requisition; close only after authoritative reconfirmation',redirect:null,applyAllowed:false};});
const plan={version:1,mode:'dry-run-only',auditCapturedAt:audit.capturedAtUTC,inputSha256:hash(bytes),fullPrivilegedBackup:false,retirements,stale,excluded:'All Westland records, including O’Leary/Kenora; different requisitions are not duplicates.',applyGates:['Read exact jobs/posts/feed versions and private scoped reference counts using separately authorized access','Privately back up complete exact documents and versions; public snapshot is NOT a Firestore rollback backup','Approve cross-employer canonical ownership without transferring applicant permissions','Deploy alias-aware saved destination reads and explicit old-slug 301 only for same requisitions','Bind transactional apply to reviewed document versions, immutable audit ID and reservation/suppression keys','On retry read existing audit receipt; preserve tombstones and immutable applications; never invoke bulk hard-delete cleanup','Independent exact-target mirror/alias/reference readback and public list verification after apply']};
const serialized=JSON.stringify(plan,null,2)+'\n';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'public-snapshot-backup.json'),bytes);fs.writeFileSync(path.join(out,'cleanup-dry-run.json'),serialized);fs.writeFileSync(path.join(out,'cleanup-dry-run.sha256'),hash(serialized)+'\n');
console.log(JSON.stringify({mode:plan.mode,duplicatePairs:retirements.length,staleRequisitions:stale.length,sha256:hash(serialized),applyAllowed:false}));
