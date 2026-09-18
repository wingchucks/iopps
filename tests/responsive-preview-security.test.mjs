import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = fs.readFileSync('src/app/demo/responsive/ResponsivePreview.tsx', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;

test('preview navigation ignores modified DOM values and resolves only predefined pages', () => {
  const state = [];
  let cursor = 0;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name !== 'react') return require(name);
      return { useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], value => { state[index] = value; }];
      } };
    },
  });
  const render = () => { cursor = 0; return exports.default(); };
  function nodes(element, type) {
    if (!element || typeof element !== 'object') return [];
    if (Array.isArray(element)) return element.flatMap(child => nodes(child, type));
    return [...(element.type === type ? [element] : []), ...nodes(element.props?.children, type)];
  }
  const options = nodes(nodes(render(), 'select')[0], 'option');
  const attacks = ['javascript:alert(document.domain)', 'data:text/html,<script>alert(1)</script>', 'https://untrusted.example/', '<img src=x onerror=alert(1)>'];
  for (const value of attacks) {
    for (const index of [...options.keys(), -1, options.length, 999]) {
      const select = nodes(render(), 'select')[0];
      select.props.onChange({ target: { value }, currentTarget: { value, selectedIndex: index } });
      const tree = render();
      const expected = (options[index] ?? options[0]).props.value;
      assert.equal(nodes(tree, 'iframe')[0].props.src, expected);
      assert.equal(nodes(tree, 'a')[0].props.href, expected);
    }
  }
});
