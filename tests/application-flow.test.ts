import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = (path: string) => readFileSync(new URL('../'+path, import.meta.url),'utf8');
test('all application entry points use one validated destination contract', () => {
 for (const path of ['src/app/jobs/page.tsx','src/app/jobs/[slug]/page.tsx','src/app/jobs/[slug]/apply/page.tsx']) {
  assert.match(source(path), /resolveApplicationDestination\(/, path);
 }
});
test('wizard actually disables Next and submit and retains persisted receipt',()=>{
 const page=source('src/app/jobs/[slug]/apply/page.tsx');
 assert.match(page,/disabled=\{!canAdvance\(\)\}/);
 assert.match(page,/disabled=\{submitting \|\| uploading/);
 assert.match(page,/setReceipt\(/);
 assert.doesNotMatch(page,/router.push\("\/applications"\)/);
 assert.doesNotMatch(page,/await setDoc\(/);
 assert.match(page,/Retry employer notification/);
 assert.match(page,/api\/applications\?postId=/);
 assert.match(page,/application=\$\{encodeURIComponent/);
});
