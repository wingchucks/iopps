import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('signup hides previous account fields before account-switch effects and clears transient files',()=>{
 const source=fs.readFileSync('src/app/signup/page.tsx','utf8');
 // The anonymous/account ownership gate augments, rather than replaces, the UID gate.
 assert.ok(source.includes('if ((observedOwner !== currentOwner && !(observedOwner === null && accountUid === currentOwner)) || (draftUid && draftUid !== user?.uid)) return <p role="status">Updating account…</p>;'));
 assert.match(source,/setEmpLogoFile\(null\); setEmpBannerFile\(null\)/);
 assert.match(source,/if \(draftUid === user\.uid\) return/);
});
