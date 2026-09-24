import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const source = readFileSync('scripts/dedupe-imported-jobs.js', 'utf8');
const secret = 'FICTIONAL-CREDENTIAL-DO-NOT-LOG';
const credentials = {
  project_id: 'demo-cleanup-fixture',
  client_email: 'fixture@example.invalid',
  private_key: secret,
};

async function run({ args = [], encoded, envFileError = false } = {}) {
  const output = [], exits = [];
  let initialized = 0;
  const exit = new Error('fixture exit');
  const context = {
    Buffer, completion: undefined,
    console: Object.fromEntries(['log', 'error', 'warn'].map(name => [name, (...parts) => output.push(parts.join(' '))])),
    process: {
      argv: ['node', 'cleanup', ...args],
      env: { FIREBASE_SERVICE_ACCOUNT_BASE64: encoded ?? Buffer.from(JSON.stringify(credentials)).toString('base64') },
      loadEnvFile: () => { throw new Error(secret); },
      exit: code => { exits.push(code); throw exit; },
    },
    require: id => {
      if (id === 'node:crypto') return { createHash };
      if (id === 'node:fs') return { existsSync: () => envFileError };
      if (id === 'firebase-admin') return {
        credential: { cert: value => value },
        initializeApp: () => { initialized++; throw new Error(secret); },
      };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  };
  // Execute the real CLI and capture its completion; every external dependency
  // is an explicit local adapter. No credentials, sockets, or database writes.
  vm.runInNewContext(source.replace('main().catch(', 'completion = main().catch('), context);
  await assert.rejects(context.completion, error => error === exit);
  assert.ok(exits.every(code => code === 1));
  assert.ok(!output.join('\n').includes(secret));
  assert.ok(!output.join('\n').includes(credentials.client_email));
  return { output: output.join('\n'), initialized };
}

test('cleanup refuses a mismatched project before initializing Firebase', async () => {
  const result = await run({ args: ['--apply', '--project', 'wrong-project'] });
  assert.equal(result.initialized, 0);
  assert.match(result.output, /Refusing to apply/);
});

test('malformed credential JSON never appears in parser error logs', async () => {
  const result = await run({ encoded: Buffer.from(secret).toString('base64') });
  assert.equal(result.initialized, 0);
  assert.match(result.output, /Cleanup failed/);
});

test('SDK errors never disclose credentials on an explicitly matched apply', async () => {
  const result = await run({ args: ['--apply', '--project', credentials.project_id] });
  assert.equal(result.initialized, 1);
  assert.match(result.output, /Cleanup failed/);
});

test('environment-file errors use the same redacted failure path', async () => {
  const result = await run({ envFileError: true });
  assert.equal(result.initialized, 0);
  assert.match(result.output, /Cleanup failed/);
});
