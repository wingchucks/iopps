// In-memory Firestore double for transactional billing tests that must run without the
// emulator. It follows the Admin SDK rules the billing code relies on: every transaction
// read precedes its writes, writes commit atomically only when the callback succeeds,
// create() refuses an existing document, update() refuses a missing one, and Dates are
// stored and returned as Timestamps.
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const DELETE = FieldValue.delete();
const SERVER_TIME = FieldValue.serverTimestamp();
const isDelete = value => value instanceof FieldValue && value.isEqual(DELETE);
// Plain maps from any realm (route code runs in a VM context): their prototype is an Object.prototype.
const plain = value => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || Object.getPrototypeOf(proto) === null;
};

function store(value, previous) {
  if (value instanceof FieldValue && value.isEqual(SERVER_TIME)) return Timestamp.now();
  if (value instanceof FieldValue && value.constructor.name === 'NumericIncrementTransform') return (typeof previous === 'number' ? previous : 0) + value.operand;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (Array.isArray(value)) return value.map(store);
  if (plain(value)) return Object.fromEntries(Object.entries(value).filter(([, v]) => !isDelete(v)).map(([k, v]) => [k, store(v)]));
  if (value instanceof FieldValue) throw new Error(`Unsupported FieldValue in fixture: ${value.constructor.name}`);
  return value;
}
function clone(value) {
  if (value instanceof Timestamp) return value;
  if (Array.isArray(value)) return value.map(clone);
  if (plain(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
  return value;
}
function deepMerge(target, patch) {
  const result = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (isDelete(value)) delete result[key];
    else if (plain(value) && plain(result[key])) result[key] = deepMerge(result[key], value);
    else result[key] = store(value, result[key]);
  }
  return result;
}
function equal(a, b) {
  if (a instanceof Timestamp && b instanceof Timestamp) return a.isEqual(b);
  return a === b;
}

export function memoryFirestore(seed = {}) {
  const docs = new Map(Object.entries(seed).map(([path, data]) => [path, store(data)]));
  let versions = 0;
  const updated = new Map();
  const touch = path => updated.set(path, ++versions);
  for (const path of docs.keys()) touch(path);

  function snapshot(path) {
    const data = docs.get(path);
    const id = path.split('/').at(-1);
    return {
      id, ref: docRef(path), exists: data !== undefined,
      data: () => (data === undefined ? undefined : clone(data)),
      get: field => (data === undefined ? undefined : clone(data[field])),
      updateTime: data === undefined ? undefined : Timestamp.fromMillis(Date.UTC(2026, 0, 1) + updated.get(path)),
    };
  }
  function docRef(path) {
    return {
      path, id: path.split('/').at(-1), kind: 'doc',
      collection: name => collectionRef(`${path}/${name}`),
      get: async () => snapshot(path),
      set: async (data, options) => { applyWrite({ type: 'set', path, data, options }); },
      update: async data => { applyWrite({ type: 'update', path, data }); },
      delete: async () => { docs.delete(path); touch(path); },
    };
  }
  function queryRef(collection, filters = [], max = Infinity) {
    return {
      kind: 'query', collection, filters, max,
      where: (field, op, value) => { if (op !== '==') throw new Error(`Unsupported operator ${op}`); return queryRef(collection, [...filters, [field, value]], max); },
      limit: count => queryRef(collection, filters, count),
      orderBy: () => queryRef(collection, filters, max),
      get: async () => runQuery(collection, filters, max),
    };
  }
  function collectionRef(path) {
    const doc = id => docRef(`${path}/${id ?? `auto-${++versions}`}`);
    return { ...queryRef(path), doc, add: async data => { const ref = doc(); applyWrite({ type: 'create', path: ref.path, data }); return ref; } };
  }
  function runQuery(collection, filters, max) {
    const matching = [...docs.keys()]
      .filter(path => path.startsWith(`${collection}/`) && !path.slice(collection.length + 1).includes('/'))
      .sort()
      .filter(path => filters.every(([field, value]) => equal(docs.get(path)[field], value)))
      .slice(0, max)
      .map(snapshot);
    return { docs: matching, size: matching.length, empty: matching.length === 0 };
  }
  function applyWrite(write) {
    const current = docs.get(write.path);
    if (write.type === 'create') {
      if (current !== undefined) throw Object.assign(new Error(`ALREADY_EXISTS: ${write.path}`), { code: 6 });
      docs.set(write.path, store(write.data));
    } else if (write.type === 'update') {
      if (current === undefined) throw Object.assign(new Error(`NOT_FOUND: ${write.path}`), { code: 5 });
      const next = clone(current);
      for (const [key, value] of Object.entries(write.data)) {
        const parts = key.split('.');
        let holder = next;
        for (const part of parts.slice(0, -1)) holder = holder[part] = plain(holder[part]) ? holder[part] : {};
        if (isDelete(value)) delete holder[parts.at(-1)]; else holder[parts.at(-1)] = store(value, holder[parts.at(-1)]);
      }
      docs.set(write.path, next);
    } else if (write.type === 'set') {
      const options = write.options ?? {};
      if (options.merge) docs.set(write.path, deepMerge(current ?? {}, write.data));
      else if (options.mergeFields) {
        const next = clone(current ?? {});
        for (const field of options.mergeFields) {
          if (field.includes('.')) throw new Error('Nested mergeFields are not supported by this double');
          if (isDelete(write.data[field])) delete next[field]; else next[field] = store(write.data[field], next[field]);
        }
        docs.set(write.path, next);
      } else docs.set(write.path, store(write.data));
    }
    touch(write.path);
  }

  const db = {
    collection: name => collectionRef(name),
    doc: path => docRef(path),
    async runTransaction(fn) {
      for (let attempt = 0; ; attempt++) {
        const writes = [];
        const readVersions = new Map();
        const tx = {
          async get(ref) {
            if (writes.length) throw new Error('Firestore transactions require all reads to be executed before all writes.');
            if (ref.kind === 'doc') { readVersions.set(ref.path, updated.get(ref.path)); return snapshot(ref.path); }
            const result = runQuery(ref.collection, ref.filters, ref.max);
            for (const doc of result.docs) readVersions.set(doc.ref.path, updated.get(doc.ref.path));
            return result;
          },
          async getAll(...refs) { return Promise.all(refs.map(ref => tx.get(ref))); },
          create(ref, data) { writes.push({ type: 'create', path: ref.path, data }); return tx; },
          set(ref, data, options) { writes.push({ type: 'set', path: ref.path, data, options }); return tx; },
          update(ref, data) { writes.push({ type: 'update', path: ref.path, data }); return tx; },
          delete(ref) { writes.push({ type: 'delete', path: ref.path }); return tx; },
        };
        const result = await fn(tx);
        // Optimistic concurrency: retry when a document read in this attempt changed meanwhile.
        if ([...readVersions].some(([path, version]) => updated.get(path) !== version)) {
          if (attempt > 4) throw new Error('Transaction contention');
          continue;
        }
        const before = new Map(docs);
        const beforeVersions = new Map(updated);
        try {
          for (const write of writes) {
            if (write.type === 'delete') { docs.delete(write.path); touch(write.path); } else applyWrite(write);
          }
        } catch (error) {
          docs.clear(); for (const [k, v] of before) docs.set(k, v);
          updated.clear(); for (const [k, v] of beforeVersions) updated.set(k, v);
          throw error;
        }
        return result;
      }
    },
  };
  /** Plain JSON-ish view of a stored document (Timestamps become Dates) for assertions. */
  function read(path) {
    const data = docs.get(path);
    const toPlain = value => value instanceof Timestamp ? value.toDate() : Array.isArray(value) ? value.map(toPlain)
      : plain(value) ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toPlain(v)])) : value;
    return data === undefined ? undefined : toPlain(data);
  }
  return { db, read, paths: prefix => [...docs.keys()].filter(path => path.startsWith(prefix)).sort() };
}
