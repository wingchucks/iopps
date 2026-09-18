import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { auditRoutes } from '../scripts/audit-public-detail-links.mjs';

test('discovers real native route paths and still reports missing navigation', () => {
  // Windows discovers backslash paths; POSIX CI discovers slash paths. No mocked filesystem.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iopps-route-audit-'));
  try {
    const files = {
      'src/app/page.tsx': 'export default function Home() { return null; }',
      'src/app/(public)/jobs/[slug]/page.tsx': 'export default function Job() { return null; }',
      'src/app/api/jobs/route.ts': 'export const GET = () => null;',
      'src/app/notpage.tsx': '',
      'src/app/api/notroute.ts': '',
      'src/navigation.tsx': `const links = [{ href: '/' }, { href: '/jobs/example' }, { href: '/logo.svg' }, { href: '/missing-page' }]; fetch('/api/jobs'); fetch('/api/missing');`,
      'public/logo.svg': '<svg />',
    };
    for (const [relative, contents] of Object.entries(files)) {
      const filename = path.join(root, relative);
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename, contents);
    }
    for (const input of new Set([root, root.split(path.sep).join('/')])) {
      const result = auditRoutes(input);
      assert.equal(result.pages, 2, 'must discover page files using real filesystem paths');
      assert.equal(result.apiRoutes, 1);
      assert.equal(result.checked, 6);
      assert.deepEqual(result.findings.map(({ url, reason }) => ({ url, reason })), [
        { url: '/missing-page', reason: 'no root route or asset' },
        { url: '/api/missing', reason: 'no root route or asset' },
      ]);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
