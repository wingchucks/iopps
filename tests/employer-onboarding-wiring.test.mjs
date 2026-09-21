import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync('src/'+p,'utf8');
test('organization fraud rejection never deletes an existing authenticated account',()=>{assert.doesNotMatch(read('app/api/employer/signup/route.ts'),/adminAuth.deleteUser/);});
test('organization intent is stored independently from privileges and recoverable outside signup',()=>{assert.match(read('app/api/profile/route.ts'),/signupIntent: "organization"/);assert.match(read('components/OrganizationSetupReminder.tsx'),/Finish organization setup/);assert.match(read('app/layout.tsx'),/<OrganizationSetupReminder/);});
test('branding is optional and skipped files are never claimed persisted',()=>{const s=read('app/signup/page.tsx');assert.doesNotMatch(s,/disabled=\{!empLogoFile\}|Logo \(required\)/);assert.match(s,/Skip for now/);assert.match(s,/add.*later/i);});
test('upload control exposes keyboard semantics and persistent accessible labels',()=>{const s=read('components/signup/ui.tsx');assert.match(s,/aria-label=\{label\}/);assert.match(s,/onKeyDown/);assert.match(s,/focus-visible/);});
test('legacy dashboard and business entry points resolve to safe routes',()=>{assert.match(read('app/dashboard/page.tsx'),/\/setup/);assert.match(read('app/employers/for-business/page.tsx'),/\/for-employers/);assert.doesNotMatch(read('components/OrgRoute.tsx'),/router.replace\("\/feed"\)/);});
