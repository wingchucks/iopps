import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute real component source with deterministic hooks; elements are plain {type, props}.
export function harness(path, supplied, directComponent = false) {
  const slots = [], pending = [], errors = [];
  let cursor = 0, tree;
  const react = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
    useRef(initial) { const i = cursor++; slots[i] ??= { current: initial }; return slots[i]; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v, j) => !Object.is(v, old.deps[j]))) { slots[i] = { deps, cleanup: old?.cleanup }; pending.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const jsx = (type, props) => ({ type, props });
  const imports = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, ...supplied }, exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console: { error: (...args) => errors.push(args) }, URLSearchParams, document: { addEventListener() {}, removeEventListener() {} }, require: id => imports[id] || { default: id } });
  const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
  const component = directComponent ? exports.default : nodes(exports.default()).find(node => typeof node.type === 'function').type;
  const render = () => {
    for (let turn = 0; turn < 12; turn++) { cursor = 0; tree = component(); if (!pending.length) return tree; for (const effect of pending.splice(0)) effect(); }
    throw new Error('Fixture hooks did not settle');
  };
  return { render, errors, nodes: () => nodes(tree), text: () => JSON.stringify(tree) };
}

// React throws for any child that is a plain object rather than an element.
export function invalidChildren(nodes) {
  const children = nodes.flatMap(node => [node.props?.children].flat(Infinity));
  return children.filter(child => child !== null && typeof child === 'object' && !('type' in child && 'props' in child));
}
