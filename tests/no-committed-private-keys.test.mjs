import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createPrivateKey } from 'node:crypto';

// Documentation and fixtures may show the PEM header as a placeholder, but a
// parseable private key must never be committed.
test('tracked files contain no usable private keys', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const leaks = [];
  for (const file of files) {
    let text;
    try { if (statSync(file).size > 2 * 1024 * 1024) continue; text = readFileSync(file, 'utf8'); } catch { continue; }
    if (!text.includes('PRIVATE KEY-----')) continue;
    for (const [block] of text.matchAll(/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g)) {
      try { createPrivateKey(block.replace(/\\n/g, '\n')); leaks.push(file); } catch { /* placeholder text, not a key */ }
    }
  }
  assert.deepEqual(leaks, [], `Remove private keys from: ${leaks.join(', ')}`);
});
