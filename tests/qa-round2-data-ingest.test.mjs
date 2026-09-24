import test from 'node:test';
import {paidImportMemoryDb} from './helpers/paid-import-fixtures.mjs';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';

for (const kind of ['manual','cron','batch']) for (const hydrate of [false, true]) test(`round2 ${kind} hydrated=${hydrate}: label-only corruption is retained and queued for review offline`, async () => {
 const store=paidImportMemoryDb();const db=store.db;const writes=store.jobWrites;
 store.rows.set('rssFeeds/fixture-feed',{active:true,feedUrl:'https://example.test/jobs.xml',feedName:'Fictional feed',employerId:'fixture-org'});
 if(kind!=='batch')store.rows.set('employers/fixture-org',{standardPostCredits:1});
 const net=offlineNetwork();
 const rawTitle=kind==='batch'?'ChildYouth Support Worker � &amp; Canad Inns':'ChildYouth Support Worker �';
 const item={guid:'fixture',title:rawTitle,link:'https://example.test/job',description:'Valid description.'};
 const options={...net,globals:{...net.globals,Date,process:{env:{CRON_SECRET:'fixture'}}},mocks:{...net.mocks,
  'next/server':{NextResponse:{json:Response.json}},'@/lib/firebase-admin':{adminDb:db,getAdminDb:()=>db},
  '@/lib/api-auth':{verifyAdminToken:async()=>({success:true,decodedToken:{uid:'fixture'}})},
  'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=> 'fixture-time'}},
  '@/lib/server/imported-job-descriptions':{...sourceModule('src/lib/server/imported-job-descriptions.ts',net),fetchImportedDescriptionPatch:async()=>hydrate?{description:'Hydrated valid description.',descriptionFormat:'plain-text',importContentQuality:{version:1,rawDescription:'Provider raw text',issues:[],needsReview:false}}:null},
  '@/lib/server/feed-source':{...sourceModule('src/lib/server/feed-source.ts'),loadFeedItems:async()=>[item]},
 }};
 const path=kind==='manual'?'src/app/api/admin/feeds/[feedId]/sync/route.ts':kind==='cron'?'src/app/api/cron/sync-feeds/route.ts':'src/app/api/admin/import-jobs/route.ts';
 const route=sourceModule(path,options);
 const req=new Request('https://fixture.test/import',{method:kind==='cron'?'GET':'POST',headers:{authorization:'Bearer fixture','x-cron-secret':'fixture','content-type':'application/json'},...(kind==='batch'?{body:JSON.stringify({jobs:[{...item,externalUrl:item.link}]})}:{})});
 const response=kind==='cron'?await route.GET(req):await route.POST(req,{params:Promise.resolve({feedId:'fixture-feed'})});
 assert.equal(response.status,200);assert.equal(writes.length,1);
 assert.equal(writes[0].title,rawTitle.replace('&amp;','&'));
 assert.equal(writes[0].importContentQuality.needsReview,true);
 assert.ok(writes[0].importContentQuality.issues.includes('replacement-character'));
 assert.equal(writes[0].importContentQuality.rawLabels.title,rawTitle);
 assert.equal(net.connections.length,0);
});
