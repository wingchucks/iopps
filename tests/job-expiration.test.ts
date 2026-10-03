import test from 'node:test';
import assert from 'node:assert/strict';
import {hasJobExpired,sourceLifecyclePatch,missingSourceJobIds,expirationPatch,confirmsEmptyFeed} from '../src/lib/server/job-expiration.ts';
const now=new Date('2026-09-08T05:30:00Z');
const url='https://jobs.dayforcehcm.com/en-US/westlandcorp/CANDIDATEPORTAL';
const feed={id:'feed',employerId:'westland',feedType:'dayforce',feedUrl:url};
const current=[{guid:'2',link:url+'/jobs/2',title:'Current'}];
test('date-only deadline stays open through its Saskatchewan calendar day',()=>{
 assert.equal(hasJobExpired('2026-09-07',now),false);
 assert.equal(hasJobExpired('2026-09-06',now),true);
 assert.equal(hasJobExpired('2026-09-07',new Date('2026-09-08T06:00:00Z')),true);
});
test('timestamps, Firestore dates, and malformed dates',()=>{
 assert.equal(hasJobExpired('2026-09-08T05:00:00Z',now),true);
 assert.equal(hasJobExpired({toDate:()=>new Date('2026-09-08T06:00:00Z')},now),false);
 assert.equal(hasJobExpired('invalid',now),false);
 assert.equal(hasJobExpired(null,now),false);
});
test('expiration hides public records and retains their identity',()=>{assert.deepEqual({...expirationPatch('closing_date',now),id:'preserved'},{active:false,status:'expired',expiredAt:now,expirationReason:'closing_date',updatedAt:now,id:'preserved'})});
test('source closing date is retained and past dates immediately expire',()=>{
 assert.equal(sourceLifecyclePatch({closingDate:'2026-09-06'},{},now).active,false);
 assert.equal(sourceLifecyclePatch({closingDate:'2026-09-10'},{},now).closingDate,'2026-09-10');
});
test('source returning can reopen only an automatically expired record',()=>{
 assert.equal(sourceLifecyclePatch({}, {status:'expired',expirationReason:'removed_from_source'},now).active,true);
 assert.equal(sourceLifecyclePatch({}, {status:'deleted',expirationReason:'removed_from_source'},now).active,undefined);
});
test('missing-source cleanup scopes employer, feed, and board while preserving current jobs',()=>{
 const jobs=[
 {id:'legacy',employerId:'westland',active:true,applyUrl:url+'/jobs/1/apply'},
 {id:'present',employerId:'westland',active:true,externalUrl:url+'/jobs/2'},
 {id:'other-board',employerId:'westland',active:true,applyUrl:url.replace('CANDIDATEPORTAL','AGILE')+'/jobs/1/apply'},
 {id:'other-employer',employerId:'other',active:true,feedId:'feed',externalId:'1'},
 {id:'other-feed',employerId:'westland',active:true,feedId:'other',externalUrl:url+'/jobs/1'},
 {id:'manual',employerId:'westland',active:true},
 ];
 assert.deepEqual(missingSourceJobIds(jobs,current,feed,0),['legacy']);
 assert.deepEqual(missingSourceJobIds(jobs,[],feed,0),[]);
 assert.deepEqual(missingSourceJobIds(jobs,current,feed,1),[]);
 assert.deepEqual(missingSourceJobIds(jobs,current,{...feed,feedType:'xml'},0),[]);
});

test('an empty feed closes its jobs only after staying empty for most of a day',()=>{
 const at=Date.parse('2026-10-03T08:40:00Z');
 const empty={lastSyncItemCount:0,lastSyncJobsFailed:0,lastSyncError:null};
 const hoursAgo=(hours:number)=>new Date(at-hours*3600_000);
 assert.equal(confirmsEmptyFeed({...empty,lastSyncedAt:hoursAgo(24)},at),true);
 assert.equal(confirmsEmptyFeed({...empty,lastSyncedAt:{toMillis:()=>hoursAgo(20).getTime()}},at),true);
 assert.equal(confirmsEmptyFeed({...empty,lastSyncedAt:hoursAgo(24).toISOString()},at),true);
 // Vercel Cron at 08:00 then its GitHub backup at 08:40, or a repeated manual sync.
 assert.equal(confirmsEmptyFeed({...empty,lastSyncedAt:hoursAgo(2/3)},at),false);
 assert.equal(confirmsEmptyFeed({...empty,lastSyncedAt:{toMillis:()=>at-5*60_000}},at),false);
 assert.equal(confirmsEmptyFeed(empty,at),false,'no recorded sync time');
 for(const previous of [{lastSyncItemCount:3},{lastSyncJobsFailed:1},{lastSyncJobsFailed:undefined},{lastSyncError:'timeout'}]){
  assert.equal(confirmsEmptyFeed({...empty,lastSyncedAt:hoursAgo(24),...previous},at),false,JSON.stringify(previous));
 }
});

test('past source dates do not overwrite manual deletions',()=>{
 assert.equal(sourceLifecyclePatch({closingDate:'2026-09-06'},{status:'deleted'},now).status,undefined);
});

test('an empty source requires a previous successful empty sync before retirement',()=>{
 const jobs=[{id:'old',employerId:'westland',active:true,feedId:'feed',externalId:'1'}];
 assert.deepEqual(missingSourceJobIds(jobs,[],feed,0),[]);
 assert.deepEqual(missingSourceJobIds(jobs,[],feed,0,true),['old']);
 assert.deepEqual(missingSourceJobIds(jobs,[],feed,1,true),[]);
});
