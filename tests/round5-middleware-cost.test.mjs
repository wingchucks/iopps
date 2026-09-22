import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('canonical transport parsing has bounded cost for repeated segment markers', () => {
  // Evaluate the exact production canonicalization with a hostile nonmatching
  // suffix, without a network server or fabricated copy of the expression.
  const script = `
    const fs = require('node:fs');
    const source = fs.readFileSync('src/middleware.ts', 'utf8');
    const start = source.indexOf('  const rawPath =');
    const end = source.indexOf('  req.nextUrl.pathname = canonicalPath;');
    if (start < 0 || end < start) throw Error('canonical parser not found');
    const req = {nextUrl: {pathname: '/profile' + '.segments/'.repeat(30000) + 'not-a-segment'}};
    const canonical = new Function('req', source.slice(start, end) + '\\nreturn canonicalPath;')(req);
    if (canonical !== req.nextUrl.pathname) throw Error('unexpected canonical path');
  `;
  const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 2000 });
  assert.equal(result.error, undefined, `canonical parsing exceeded budget: ${result.error?.code}`);
  assert.equal(result.status, 0, result.stderr);
});
