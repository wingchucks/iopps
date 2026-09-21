import test from 'node:test';
import assert from 'node:assert/strict';
import type { SavedItem } from '../src/lib/firestore/savedItems';
import { groupSavedAliases } from '../src/lib/saved-job-aliases.ts';
test('alias display groups preserve actual save IDs, ownership and timestamps',()=>{
 const old:SavedItem={postTitle:'Role',id:'legacy-random',userId:'u',postId:'old',postType:'job',savedAt:123};
 const newer:SavedItem={...old,id:'u_new',postId:'new',savedAt:456};
 const groups=groupSavedAliases([old,newer],[{originalId:'old',canonicalId:'new',destination:'/jobs/role--new'}]);
 assert.equal(groups.length,1); assert.deepEqual(groups[0].records,[old,newer]);
 assert.equal(groups[0].destination,'/jobs/role--new'); assert.equal(old.postId,'old');
 assert.equal(groupSavedAliases([old,newer],[]).length,2);
});
