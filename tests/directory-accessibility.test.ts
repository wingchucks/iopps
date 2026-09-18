import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import ts from "typescript";

const root = process.cwd();
const directoryPages = ["businesses", "events", "jobs", "scholarships", "schools", "training"];

function filterControls(source: string) {
  const tree = ts.createSourceFile("directory.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const labels: ts.JsxElement[] = [], controls: (ts.JsxOpeningElement | ts.JsxSelfClosingElement)[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === "label") labels.push(node);
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ["input", "select", "ProvinceSelect"].includes(node.tagName.getText(tree))) controls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  const attr = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, name: string) => node.attributes.properties.find((value): value is ts.JsxAttribute => ts.isJsxAttribute(value) && value.name.getText(tree) === name)?.initializer;
  const textAttr = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, name: string) => {
    const value = attr(node, name); return value && ts.isStringLiteral(value) ? value.text : undefined;
  };
  const hasName = (value: ts.JsxAttributeValue | undefined) => !!value && (ts.isStringLiteral(value) ? !!value.text.trim() : ts.isJsxExpression(value) && !!value.expression);
  const labelHasText = (label: ts.JsxElement) => label.children.some(child => ts.isJsxText(child) ? !!child.text.trim() : ts.isJsxExpression(child) && !!child.expression);
  return controls.map(control => {
    const id = textAttr(control, "id");
    let ancestor: ts.Node | undefined = control.parent;
    let wrapped = false;
    while (ancestor) {
      if (ts.isJsxElement(ancestor) && ancestor.openingElement.tagName.getText(tree) === "label" && labelHasText(ancestor)) wrapped = true;
      ancestor = ancestor.parent;
    }
    return { source: control.getText(tree), named: hasName(attr(control, "aria-label")) || hasName(attr(control, "aria-labelledby")) || wrapped || !!id && labels.some(label => textAttr(label.openingElement, "htmlFor") === id && labelHasText(label)) };
  });
}

test("directory label check accepts native labels but rejects an ID without a label", () => {
  assert.ok(filterControls('<><label htmlFor="p">Province</label><select id="p" /></>')[0].named);
  assert.ok(filterControls('<label>Province<select /></label>')[0].named);
  assert.ok(filterControls('<input aria-label="Search" />')[0].named);
  assert.equal(filterControls('<div>Province<select id="p" /></div>')[0].named, false);
  assert.equal(filterControls('<label><select><option>All provinces</option></select></label>')[0].named, false);
});

test("directory filter controls have accessible names and result updates are announced", () => {
  for (const route of directoryPages) {
    const page = readFileSync(path.join(root, "src", "app", route, "page.tsx"), "utf8");
    const shared = ["events", "scholarships"].includes(route);
    if (shared) assert.match(page, new RegExp(`<OpportunityDirectory kind="${route}"`));
    const source = shared ? readFileSync(path.join(root, "src/components/opportunities/OpportunityDirectory.tsx"), "utf8") : page;
    const controls = filterControls(source);
    assert.ok(controls.length > 0, `${route} must expose filter controls`);
    for (const control of controls) {
      assert.ok(control.named, `${route} has an unnamed input or select: ${control.source.slice(0, 80)}`);
    }
    assert.match(source, /aria-live=["']polite["']/, `${route} needs a polite result-count live region`);
    assert.match(source, /id=["']directory-results["'][^>]*tabIndex=\{-1\}/, `${route} needs a focusable results target`);
  }
});

test("multi-filter directory updates are atomic", () => {
  const pagination = readFileSync(path.join(root, "src/components/DirectoryPagination.tsx"), "utf8");
  const scholarships = readFileSync(path.join(root, "src/components/opportunities/OpportunityDirectory.tsx"), "utf8");
  const training = readFileSync(path.join(root, "src/app/training/page.tsx"), "utf8");

  assert.match(pagination, /useDirectoryFilterActions/);
  assert.match(pagination, /Object\.entries\(updates\)/);
  assert.match(scholarships, /setFilters\(\{[\s\S]*closing:[\s\S]*rolling:/);
  assert.match(training, /setFilters\(\{ q: null, category: null, format: null \}\)/);
});
