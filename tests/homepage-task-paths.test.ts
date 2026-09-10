import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/page.tsx", "utf8");
test("homepage hero offers all four task-first destinations", () => {
 const hero=source.slice(source.indexOf('<section className="op-hero">'),source.indexOf('<section className="op-jobs">'));
 for(const [label,href] of [['Find work','/jobs'],['Hire talent','/for-employers'],['Learn','/training'],['Events & live','/events']]) {
  assert.ok(hero.includes(`href="${href}"`),`missing ${href} in hero`);
  assert.ok(hero.includes(label),`missing ${label} in hero`);
 }
 assert.match(hero,/aria-label="Choose your next step"/);
 assert.match(hero,/form action="\/jobs"/);
 assert.match(hero,/name="q"/);
 assert.match(hero,/name="location"/);
});
test("current homepage responsive controls can shrink and task links wrap",()=>{
 const css=readFileSync('src/app/opportunity.css','utf8');
 assert.match(css,/\.op-search label\s*\{[^}]*min-width:\s*0/s);
 assert.match(css,/@media \(max-width: 540px\)[\s\S]*\.op-search\s*\{\s*flex-direction: column/);
 assert.match(css,/\.op-task-links\s*\{[^}]*flex-wrap:\s*wrap/s);
 // Actual viewport overflow is checked by the loopback-only Chrome smoke.
});
