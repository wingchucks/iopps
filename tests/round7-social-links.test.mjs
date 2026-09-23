import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './helpers/security-fixtures.mjs';
import {readFileSync} from 'node:fs';
test('TikTok and YouTube survive the real organization normalization and contact-save path',()=>{
 const {normalizeOrganizationSocialLinks,normalizeOrganizationRecord}=sourceModule('src/lib/organization-profile.ts');
 const socialLinks={tiktok:'https://www.tiktok.com/@fictional',youtube:'https://www.youtube.com/@fictional',facebook:'https://facebook.com/fictional'};
 assert.equal(JSON.stringify(normalizeOrganizationSocialLinks(socialLinks)),JSON.stringify({facebook:socialLinks.facebook,tiktok:socialLinks.tiktok,youtube:socialLinks.youtube}));
 assert.equal(normalizeOrganizationRecord({name:'Fictional',socialLinks}).socialLinks.tiktok,socialLinks.tiktok);
 for(const key of ['tiktok','youtube']){
  assert.match(readFileSync('src/components/org-dashboard/CanonicalEditProfileTab.tsx','utf8'),new RegExp(key+': profileForm\\.'+key));
  assert.match(readFileSync('src/app/org/[slug]/page.tsx','utf8'),new RegExp('socialLinks!\\.'+key));
 }
});
