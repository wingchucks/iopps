import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';import {sourceModule} from './helpers/security-fixtures.mjs';
test('new business hours remain explicitly unset and are omitted from public normalization',()=>{
 const source=readFileSync('src/app/org/dashboard/page.tsx','utf8');const fn=source.match(/function createDefaultHours\(\): HoursMap \{[\s\S]*?\n\}/)[0];const js=ts.transpile(fn,{target:ts.ScriptTarget.ES2022});const days=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];const hours=Function('DAYS',js+';return createDefaultHours();')(days);
 for(const h of Object.values(hours)){assert.equal(h.open,'');assert.equal(h.close,'');assert.equal(h.configured,false);}
 const {normalizeOrganizationHours,formatOrganizationHoursDay}=sourceModule('src/lib/organization-profile.ts');assert.equal(normalizeOrganizationHours(hours),undefined);assert.equal(formatOrganizationHoursDay(hours.monday),'Not provided');
 const saved=normalizeOrganizationHours({monday:{open:'10:00',close:'18:00',isOpen:true,configured:true},tuesday:{open:'',close:'',isOpen:false,configured:true}});assert.equal(saved.monday.open,'10:00');assert.equal(formatOrganizationHoursDay(saved.tuesday),'Closed');
});
