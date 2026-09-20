import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToString } from 'react-dom/server';
import { Parser } from 'htmlparser2';
import ts from 'typescript';

// Real server rendering plus a deterministic mount/effect unit fixture. This is
// not hydrateRoot/Next acceptance; the owner runs the held-chunk browser repro.
// The page, draft hook, URL actions and discovery/filter helpers are exact source.
function fixture(query = '', server = false) {
  let url = new URL(`http://fixture.invalid/jobs${query}`);
  let cursor = 0, now = 0, timerId = 0, resolveJobs;
  const cells = [], effects = [], cleanups = [], timers = new Map();
  const jobsResponse = new Promise(resolve => { resolveJobs = resolve; });
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    ...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial;
      return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in cells)) cells[i] = { current: initial };
      return cells[i];
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!sameDeps(cells[i]?.deps, deps)) cells[i] = { value: fn(), deps };
      return cells[i].value;
    },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!sameDeps(cells[i]?.deps, deps)) {
        cells[i] = { deps };
        effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
      }
    },
  };
  const shell = ({ children, href }) => React.createElement(href ? 'a' : 'div', { href }, children);
  const boundaries = {
    react: server ? React : hooks,
    'react/jsx-runtime': jsxRuntime,
    'next/navigation': { useSearchParams: () => url.searchParams },
    'next/link': { default: shell },
    '@/components/OpportunityHeader': { default: shell },
    '@/components/EmployerLogo': { default: shell },
    '@/lib/job-funnel-analytics': { trackJobFunnelEvent() {} },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText, {
      exports, console, URLSearchParams, AbortSignal,
      window: {
        get location() { return url; },
        history: { replaceState(_state, _unused, next) { url = new URL(next, url); } },
        addEventListener() {}, removeEventListener() {},
      },
      document: { activeElement: null }, HTMLElement: class {},
      setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
      clearTimeout(id) { timers.delete(id); },
      fetch(resource) {
        if (resource === '/api/jobs') return jobsResponse;
        assert.equal(resource, '/api/organizations');
        return Promise.resolve({ ok: true, json: async () => ({ orgs: [] }) });
      },
      require(id) {
        if (id in boundaries) return boundaries[id];
        const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(file), id);
        const target = (path.extname(base) ? [base] : ['.ts', '.tsx'].map(ext => base + ext)).find(name => {
          try { readFileSync(name); return true; } catch { return false; }
        });
        assert.ok(target, `Unexpected dependency: ${id}`);
        return load(target);
      },
    }, { filename: file });
    return exports;
  }
  const Page = load(path.resolve('src/app/jobs/page.tsx')).default;
  return {
    html: () => renderToString(React.createElement(Page)),
    render() {
      cursor = 0;
      const content = Page().props.children;
      return content.type(content.props);
    },
    effects() { for (const effect of effects.splice(0)) effect(); },
    advance(ms) {
      now += ms;
      for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    },
    resolveJobs() { resolveJobs({ ok: true, json: async () => ({ jobs: [{ id: 'fictional', title: 'Registered nurse', location: 'Saskatoon, SK', employerName: 'Fictional employer' }] }) }); },
    get url() { return url; },
    dispose() { for (const cleanup of cleanups) cleanup?.(); },
  };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function controls(tree) {
  const all = nodes(tree);
  return {
    q: all.find(n => n.props?.['aria-label'] === 'Search jobs'),
    location: all.find(n => n.props?.['aria-label'] === 'Filter jobs by city or province'),
    submit: all.find(n => n.type === 'button' && n.props.type === 'submit'),
    status: all.find(n => n.props?.role === 'status'),
  };
}
for (const query of ['', '?q=nurse&location=Saskatoon']) {
  test(`jobs SSR prevents text entry/submission before initialization (${query || 'empty URL'})`, () => {
    const h = fixture(query, true), html = h.html(), tags = [];
    const parser = new Parser({ onopentag(name, attrs) { tags.push({ name, attrs }); } });
    parser.end(html);
    for (const label of ['Search jobs', 'Filter jobs by city or province']) {
      const input = tags.find(tag => tag.attrs['aria-label'] === label);
      assert.ok(input, `${label} remains server-rendered`);
      assert.ok(Object.hasOwn(input.attrs, 'disabled'), `${label} must be disabled in SSR`);
    }
    const submit = tags.find(tag => tag.name === 'button' && tag.attrs.type === 'submit');
    assert.ok(Object.hasOwn(submit.attrs, 'disabled'), 'Search submit must be disabled in SSR');
    assert.match(html, /role="status"[^>]*>Preparing search/);
    if (query) {
      assert.equal(tags.find(tag => tag.attrs['aria-label'] === 'Search jobs').attrs.value, 'nurse');
      assert.equal(tags.find(tag => tag.attrs['aria-label'] === 'Filter jobs by city or province').attrs.value, 'Saskatoon');
    }
  });
}
test('jobs enables after mount effects, retains typing across delayed jobs, debounce and reload', async t => {
  const h = fixture('?keep=1#results');
  t.after(() => h.dispose());
  let c = controls(h.render());
  for (const control of [c.q, c.location, c.submit]) assert.equal(control.props.disabled, true);
  assert.equal(c.status.props.children, 'Preparing search…');
  h.effects();
  c = controls(h.render());
  for (const control of [c.q, c.location, c.submit]) assert.equal(control.props.disabled, false, 'ready without waiting for jobs response');
  assert.equal(c.status, undefined);
  function type(key, text) {
    for (const char of text) {
      const input = controls(h.render())[key];
      assert.equal(input.props.disabled, false);
      input.props.onChange({ target: { value: input.props.value + char } });
      h.render(); h.effects(); h.advance(90);
    }
  }
  type('q', 'nurs');
  h.resolveJobs();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(controls(h.render()).q.props.value, 'nurs', 'jobs response cannot erase pending draft');
  type('q', 'e');
  assert.equal(controls(h.render()).q.props.value, 'nurse');
  assert.equal(h.url.searchParams.get('q'), null, 'normal-speed typing waits for debounce');
  type('location', 'Saskatoon');
  assert.equal(controls(h.render()).location.props.value, 'Saskatoon');
  assert.equal(h.url.searchParams.get('location'), null);
  h.advance(400); h.render(); h.effects();
  assert.equal(h.url.searchParams.get('q'), 'nurse');
  assert.equal(h.url.searchParams.get('location'), 'Saskatoon');
  assert.equal(h.url.searchParams.get('keep'), '1');
  assert.equal(h.url.hash, '#results');
  const reload = fixture(h.url.search + h.url.hash);
  t.after(() => reload.dispose());
  c = controls(reload.render());
  assert.equal(c.q.props.disabled, true);
  assert.equal(c.q.props.value, 'nurse');
  assert.equal(c.location.props.value, 'Saskatoon');
  reload.effects();
  c = controls(reload.render());
  assert.equal(c.q.props.disabled, false);
  assert.equal(c.location.props.disabled, false);
  assert.equal(c.submit.props.disabled, false);
  assert.equal(c.q.props.value, 'nurse');
  assert.equal(c.location.props.value, 'Saskatoon');
});
