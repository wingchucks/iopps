import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync((process.env.ROUND7_OPTIONS_BASELINE ? 'reports/round7-simplicity/before/src/' : 'src/')+p,'utf8');
const options=(source,name)=>Function('return '+source.match(new RegExp('const '+name+' = (\\[[\\s\\S]*?\\]);'))[1])();
test('industry choices include common small businesses in both profile entry points',()=>{
 for(const [file,name] of [['components/org-dashboard/CanonicalEditProfileTab.tsx','INDUSTRY_OPTIONS'],['app/org/onboarding/page.tsx','INDUSTRIES']])for(const choice of ['Food & Beverage','Personal Care & Beauty','Automotive Services','Sports & Recreation'])assert.ok(options(read(file),name).includes(choice),file+': '+choice);
});
test('employment choices in create, edit and discovery agree',()=>{
 const created=[...read('app/org/dashboard/jobs/new/page.tsx').split('<FormField label="Employment Type">')[1].split('</Select>')[0].matchAll(/<option>(Full-time|Part-time|Contract|Temporary|Seasonal|Internship|Volunteer|Casual)<\/option>/g)].map(m=>m[1]).sort();
 const edited=options(read('app/org/dashboard/jobs/[id]/edit/page.tsx'),'employmentTypes').sort();const filters=options(read('app/jobs/page.tsx'),'employmentTypes').filter(x=>x!=='All').sort();assert.deepEqual(created,filters);assert.deepEqual(edited,filters);assert.ok(filters.includes('Seasonal'));assert.ok(filters.includes('Temporary'));assert.ok(filters.includes('Volunteer'));
});
test('community choices contain identity, not industries',()=>{
 const source=read('app/org/dashboard/jobs/new/page.tsx'),tags=options(source,'COMMUNITY_TAGS');for(const tag of ['Healthcare','Education','Government','Technology','Trades'])assert.ok(!tags.includes(tag),tag);assert.ok(tags.includes('Cree'));assert.ok(tags.includes('Métis'));assert.match(source,/Choose community or Nation connections/);
});
