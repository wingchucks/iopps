import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const root = process.cwd();

function source(name: string) {
  return readFileSync(path.join(root, "src", "components", name), "utf8");
}

test("desktop and mobile navigation expose names and current-page state", () => {
  const rail = source("IconRailSidebar.tsx");
  assert.match(rail, /<nav[\s\S]*?aria-label=["']Primary navigation["']/);
  assert.match(rail, /aria-current=\{active \? ["']page["'] : undefined\}/);

  const navbar = source("NavBar.tsx");
  assert.match(navbar, /<nav[\s\S]*?aria-label=["']Primary navigation["']/);
  assert.match(navbar, /aria-expanded=\{menuOpen\}/);
  assert.match(navbar, /aria-controls=["']mobile-navigation-menu["']/);
  assert.match(navbar, /id=["']mobile-navigation-menu["']/);
  assert.match(navbar, /role=["']dialog["']/);
  assert.match(navbar, /aria-modal=["']true["']/);
  assert.match(navbar, /aria-current=\{active \? ["']page["'] : undefined\}/);
  assert.match(navbar, /e\.key === ["']Escape["']/);
  assert.match(navbar, /menuButton\?\.focus\(\)/);
  assert.match(navbar, /drawerRef\.current\?\.querySelector/);
});
