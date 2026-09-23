import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EMPLOYMENT_TYPE_OPTIONS} from '../src/lib/job-taxonomy.ts';
const read=p=>readFileSync((process.env.ROUND7_OPTIONS_BASELINE ? 'reports/round7-simplicity/before/src/' : 'src/')+p,'utf8');
const options=(source,name)=>Function('return '+source.match(new RegExp('const '+name+' = (\\[[\\s\\S]*?\\]);'))[1])();
test('industry choices include common small businesses in both profile entry points',()=>{
 for(const [file,name] of [['components/org-dashboard/CanonicalEditProfileTab.tsx','INDUSTRY_OPTIONS'],['app/org/onboarding/page.tsx','INDUSTRIES']])for(const choice of ['Food & Beverage','Personal Care & Beauty','Automotive Services','Sports & Recreation'])assert.ok(options(read(file),name).includes(choice),file+': '+choice);
});
test('employment choices in create, edit and discovery agree',()=>{
 // The shared taxonomy is the single source of truth: all three surfaces
 // must import EMPLOYMENT_TYPE_OPTIONS from @/lib/job-taxonomy so employer
 // and job-seeker wording cannot drift apart.
 for(const file of ['app/org/dashboard/jobs/new/page.tsx','app/org/dashboard/jobs/[id]/edit/page.tsx','app/jobs/page.tsx'])assert.match(read(file),/import\s*\{[^}]*\bEMPLOYMENT_TYPE_OPTIONS\b[^}]*\}\s*from\s*["']@\/lib\/job-taxonomy["']/,file+' must use the shared employment-type vocabulary');
 const shared=[...EMPLOYMENT_TYPE_OPTIONS].sort();
 for(const choice of ['Full-time','Part-time','Contract','Casual','Temporary','Seasonal','Internship','Volunteer'])assert.ok(shared.includes(choice),choice);
});
test('community choices contain identity, not industries',()=>{
 const source=read('app/org/dashboard/jobs/new/page.tsx'),tags=options(source,'COMMUNITY_TAGS');for(const tag of ['Healthcare','Education','Government','Technology','Trades'])assert.ok(!tags.includes(tag),tag);assert.ok(tags.includes('Cree'));assert.ok(tags.includes('Métis'));assert.match(source,/Choose community or Nation connections/);
});
