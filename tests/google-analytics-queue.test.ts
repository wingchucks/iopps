import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("Google tag queues protocol-compatible commands and preserves an existing writer", () => {
  const source = readFileSync("src/components/GoogleAnalytics.tsx", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const queue: IArguments[] = [];
  const browser: {dataLayer: IArguments[]; gtag?: (...args: unknown[]) => void} = {dataLayer: queue};
  const exports: {default?: () => {onReady: () => void}} = {};
  const mocks: Record<string, unknown> = {
    "react": {useEffect: () => {}, useState: () => [false, () => {}]},
    "react/jsx-runtime": {jsx: (_type: unknown, props: unknown) => props},
    "next/script": {default: "script"},
    "next/navigation": {usePathname: () => "/"},
    "@/lib/analytics/privacy": {analyticsPath: () => "/"},
    "@/lib/job-funnel-analytics": {flushJobFunnelEvents: () => {}},
  };
  vm.runInNewContext(code, {exports, window: browser, process: {env: {NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-FICTIONAL"}}, require: (id: string) => {assert.ok(id in mocks, id); return mocks[id];}});
  exports.default!().onReady();
  assert.equal(queue.length, 3);
  for (const command of queue) {
    assert.equal(Object.prototype.toString.call(command), "[object Arguments]");
    assert.equal(Array.isArray(command), false);
  }
  assert.equal(queue[2][0], "config");
  assert.equal(queue[2][1], "G-FICTIONAL");
  assert.equal((queue[2][2] as {send_page_view: boolean}).send_page_view, false);
  const writer = browser.gtag;
  exports.default!().onReady();
  assert.equal(browser.gtag, writer);
});
