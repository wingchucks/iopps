import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

const requireFromApp = createRequire(path.join(process.env.IOPPS_DEPENDENCY_BASELINE || process.cwd(), 'package.json'));
for (const consumer of ['gaxios', 'google-gax', 'teeny-request']) {
  test(`${consumer} resolves compatible CommonJS UUID with valid v4 output and bounded writes`, () => {
    // Resolve as the actual Google dependency does, including any nested copy.
    const requireFromConsumer = createRequire(requireFromApp.resolve(consumer));
    const uuid = requireFromConsumer('uuid');
    const first = uuid.v4(), second = uuid.v4();
    assert.equal(uuid.validate(first), true); assert.equal(uuid.version(first), 4);
    assert.notEqual(first, second);
    assert.throws(() => uuid.v5('offline-fixture', uuid.v5.DNS, new Uint8Array(15)), RangeError);
    assert.throws(() => uuid.v5('offline-fixture', uuid.v5.DNS, new Uint8Array(16), 1), RangeError);
    assert.throws(() => uuid.v6({}, new Uint8Array(15)), RangeError);
    assert.equal(requireFromConsumer('uuid/package.json').version, '11.1.1');
  });
}
