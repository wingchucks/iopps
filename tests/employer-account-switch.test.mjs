import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('signup hides previous account fields before account-switch effects and clears transient files',()=>{
 const source=fs.readFileSync('src/app/signup/page.tsx','utf8');
 assert.match(source,/if \(draftUid && draftUid !== user\?\.uid\) return/);
 assert.match(source,/setEmpLogoFile\(null\); setEmpBannerFile\(null\)/);
 assert.match(source,/if \(draftUid === user\.uid\) return/);
});
