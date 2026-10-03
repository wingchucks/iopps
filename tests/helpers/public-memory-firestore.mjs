// In-memory Firestore double for public read paths: equality / range / `in`
// filters, orderBy, select, limit, startAfter, getAll and atomic batches. It
// records every query so tests can prove which reads a code path performs.
const codePointOrder = (left, right) => {
  const a = Array.from(left), b = Array.from(right);
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const delta = a[index].codePointAt(0) - b[index].codePointAt(0);
    if (delta) return delta;
  }
  return a.length - b.length;
};

const comparable = value => value instanceof Date ? value.getTime() : value;

function matches(row, [field, operator, value]) {
  const actual = row[field];
  if (operator === '==') return actual === value;
  if (operator === 'in') return value.includes(actual);
  // Range filters only match values of the same type, as in Firestore.
  if (value instanceof Date && !(actual instanceof Date)) return false;
  if (typeof value !== typeof actual && !(value instanceof Date)) return false;
  if (operator === '>=') return comparable(actual) >= comparable(value);
  if (operator === '>') return comparable(actual) > comparable(value);
  if (operator === '<=') return comparable(actual) <= comparable(value);
  if (operator === '<') return comparable(actual) < comparable(value);
  throw new Error(`Unsupported operator ${operator}`);
}

export function memoryFirestore(seed = {}) {
  const store = new Map(Object.entries(seed).map(([name, rows]) => [name, new Map(Object.entries(rows))]));
  const rowsOf = name => store.get(name) || store.set(name, new Map()).get(name);
  const reads = { queries: [], documents: 0 };
  const snapshot = (name, id, fields) => {
    const row = rowsOf(name).get(id);
    const data = row && (fields ? Object.fromEntries(fields.filter(field => field in row).map(field => [field, row[field]])) : row);
    return { id, exists: Boolean(row), ref: ref(name, id), data: () => data && { ...data } };
  };
  const ref = (name, id) => ({ id, collection: name, path: `${name}/${id}`, get: async () => { reads.documents++; return snapshot(name, id); } });
  const query = (name, state = { filters: [], order: null, fields: null, max: Infinity, after: null }) => ({
    where: (field, operator, value) => query(name, { ...state, filters: [...state.filters, [field, operator, value]] }),
    orderBy: (field, direction = 'asc') => query(name, { ...state, order: [field, direction] }),
    select: (...fields) => query(name, { ...state, fields }),
    limit: max => query(name, { ...state, max }),
    startAfter: document => {
      // As in the Admin SDK, a snapshot cursor must carry the ordered field (select() must include it).
      if (state.order && document.data()?.[state.order[0]] === undefined) throw new Error(`Field "${state.order[0]}" is missing in the provided DocumentSnapshot.`);
      return query(name, { ...state, after: document.id });
    },
    doc: id => ref(name, id),
    get: async () => {
      reads.queries.push({ collection: name, filters: state.filters.map(([field, operator, value]) => [field, operator, value]), fields: state.fields, limit: state.max, order: state.order });
      let rows = [...rowsOf(name).entries()].filter(([, row]) => state.filters.every(filter => matches(row, filter)));
      rows.sort(([a], [b]) => codePointOrder(a, b));
      if (state.order) {
        const [field, direction] = state.order;
        rows = rows.filter(([, row]) => row[field] !== undefined)
          .sort(([, a], [, b]) => (comparable(a[field]) - comparable(b[field])) * (direction === 'desc' ? -1 : 1));
      }
      if (state.after !== null) rows = rows.slice(rows.findIndex(([id]) => id === state.after) + 1);
      rows = rows.slice(0, state.max);
      reads.documents += Math.max(rows.length, 1);
      const docs = rows.map(([id]) => snapshot(name, id, state.fields));
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
  });
  const apply = (target, patch) => {
    const next = { ...target };
    for (const [key, value] of Object.entries(patch)) next[key] = value && typeof value === 'object' && 'increment' in value ? (Number(next[key]) || 0) + value.increment : value;
    return next;
  };
  return {
    reads,
    store,
    collection: name => query(name),
    getAll: async (...refs) => { reads.documents += refs.length; return refs.map(item => snapshot(item.collection, item.id)); },
    batch() {
      const writes = [];
      return {
        create: (target, data) => { writes.push(['create', target, data]); },
        update: (target, data) => { writes.push(['update', target, data]); },
        set: (target, data) => { writes.push(['set', target, data]); },
        commit: async () => {
          for (const [kind, target] of writes) {
            const exists = rowsOf(target.collection).has(target.id);
            if (kind === 'create' && exists) throw Object.assign(new Error(`Document already exists: ${target.path}`), { code: 6 });
            if (kind === 'update' && !exists) throw Object.assign(new Error(`No document to update: ${target.path}`), { code: 5 });
          }
          for (const [kind, target, data] of writes) {
            const rows = rowsOf(target.collection);
            rows.set(target.id, kind === 'update' ? apply(rows.get(target.id), data) : { ...data });
          }
        },
      };
    },
  };
}
