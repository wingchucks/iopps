import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {authIntentHref} from '../src/lib/auth-redirect.ts';
test('community upgrade carries validated purchase intent through both navigation boundaries',()=>{
 const signup=readFileSync('src/app/org/signup/page.tsx','utf8');const upgrade=readFileSync('src/app/org/upgrade/page.tsx','utf8');
 assert.match(signup,/router\.replace\(authIntentHref\("\/org\/upgrade", searchParams\)\)/);
 assert.match(upgrade,/router\.push\(authIntentHref\("\/org\/onboarding", searchParams\)\)/);
 const result=new URL(authIntentHref('/org/upgrade',new URLSearchParams('plan=featured-post&redirect=%2Forg%2Fdashboard%2Fjobs%2Fnew')),'https://example.invalid');
 assert.equal(result.searchParams.get('plan'),'featured-post');assert.equal(result.searchParams.get('redirect'),'/org/dashboard/jobs/new');
});
