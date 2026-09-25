import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('homepage and job detail metadata use short-lived shared caches for public reads', () => {
  const cache = read('src/lib/server/public-page-cache.ts');
  assert.match(cache, /export const PUBLIC_PAGE_CACHE_SECONDS = 300;/);
  for (const [name, source] of [['getCachedLatestJobs', 'getLatestJobs'], ['getCachedPartners', 'getPartners'], ['getCachedJobMetadata', 'generateJobMetadata'], ['getCachedJobJsonLd', 'generateJobJsonLd']]) {
    assert.ok(cache.includes(`export const ${name} = unstable_cache(${source}, [`), name);
  }
  const home = read('src/app/page.tsx');
  assert.match(home, /await Promise\.all\(\[getCachedLatestJobs\(\), getCachedPartners\(\)\]\)/);
  assert.doesNotMatch(home, /from "@\/lib\/server\/landing-content"/);
  const layout = read('src/app/jobs/[slug]/layout.tsx');
  assert.match(layout, /return getCachedJobMetadata\(slug\);/);
  assert.match(layout, /await getCachedJobJsonLd\(slug\);/);
});

test('personalized and live job data stay uncached', () => {
  // The underlying readers remain directly callable and the job detail content API stays no-store.
  assert.doesNotMatch(read('src/lib/server/landing-content.ts'), /unstable_cache|next\/cache/);
  assert.doesNotMatch(read('src/lib/server/detail-metadata.ts'), /unstable_cache|next\/cache/);
  assert.match(read('src/app/api/jobs/[id]/route.ts'), /no-store/);
  // Alias redirects keep rollback semantics: resolved per request.
  assert.match(read('src/app/jobs/[slug]/page.tsx'), /await readJobAliasRedirect\(getAdminDb\(\), slug\)/);
});
