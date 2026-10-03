import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('homepage and job detail metadata use short-lived shared caches for public reads', () => {
  const cache = read('src/lib/server/public-page-cache.ts');
  assert.match(cache, /export const PUBLIC_PAGE_CACHE_SECONDS = 300;/);
  for (const [name, source] of [['getCachedLatestJobs', 'getLatestJobs'], ['getCachedPartners', 'getPartners'], ['getCachedJobMetadata', 'generateJobMetadata'], ['getCachedJobJsonLd', 'generateJobJsonLd']]) {
    // Bounded reads: a hung Firestore call fails (keeping the last good value) instead of holding the request.
    assert.ok(cache.includes(`export const ${name} = unstable_cache(withPublicReadTimeout(${source}, `), name);
  }
  const home = read('src/app/page.tsx');
  // A failed read is handled outside the cache, so an empty result is never cached.
  assert.match(home, /publicReadOr\("Homepage jobs", getCachedLatestJobs\(\), \[\]\)/);
  assert.match(home, /publicReadOr\("Homepage partners", getCachedPartners\(\), \[\]\)/);
  assert.doesNotMatch(home, /from "@\/lib\/server\/landing-content"/);
  const layout = read('src/app/jobs/[slug]/layout.tsx');
  assert.match(layout, /return getJobPageMetadata\(slug\);/);
  assert.match(layout, /await getJobPageJsonLd\(slug\);/);
  assert.match(cache, /publicReadOr\([^)]*getCachedJobMetadata\(slug\)/s);
  assert.match(cache, /publicReadOr\([^)]*getCachedJobJsonLd\(slug\), null\)/);
  assert.match(read('src/app/jobs/layout.tsx'), /publicReadOr\("Jobs partners", getCachedPartners\(\), \[\]\)/);
});

test('personalized and live job data stay uncached', () => {
  // The underlying readers remain directly callable and the job detail content API stays no-store.
  assert.doesNotMatch(read('src/lib/server/landing-content.ts'), /unstable_cache|next\/cache/);
  assert.doesNotMatch(read('src/lib/server/detail-metadata.ts'), /unstable_cache|next\/cache/);
  assert.match(read('src/app/api/jobs/[id]/route.ts'), /no-store/);
  // Alias redirects keep rollback semantics: resolved per request, never cached. A failed or
  // slow lookup renders the job page without a redirect instead of an error page.
  const jobPage = read('src/app/jobs/[slug]/page.tsx');
  assert.match(jobPage, /withPublicReadTimeout\(\s*\(slug: string\) => readJobAliasRedirect\(getAdminDb\(\), slug\),/);
  assert.match(jobPage, /await publicReadOr\(`Job alias redirect for \$\{slug\}`, readAliasRedirect\(slug\), null\)/);
  assert.doesNotMatch(jobPage, /unstable_cache|next\/cache/);
});
