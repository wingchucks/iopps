import test from "node:test";
import assert from "node:assert/strict";
import { directoryReturnHref, rememberDirectoryPosition, restoreDirectoryScroll } from "../src/lib/directory-return.ts";

function fakeWindow(pathname: string, search = "", scrollY = 0) {
  const store = new Map<string, string>();
  const scrolled: number[] = [];
  const win = {
    location: { pathname, search },
    scrollY,
    scrollTo: ({ top }: { top: number }) => { scrolled.push(top); },
    sessionStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } },
  };
  (globalThis as Record<string, unknown>).window = win;
  return { win, store, scrolled };
}

test("Back to Jobs returns to the same search, filters, sort and page, then restores scroll once", () => {
  const { win, scrolled } = fakeWindow("/jobs", "?q=nurse&location=SK&sort=newest&page=3", 1840);
  rememberDirectoryPosition("jobs");
  win.location = { pathname: "/jobs/some-role", search: "" };
  assert.equal(directoryReturnHref("jobs"), "/jobs?q=nurse&location=SK&sort=newest&page=3");
  assert.equal(directoryReturnHref("businesses"), "/businesses", "each directory keeps its own place");
  win.location = { pathname: "/jobs", search: "?q=nurse&location=SK&sort=newest&page=3" };
  restoreDirectoryScroll("jobs");
  restoreDirectoryScroll("jobs");
  assert.deepEqual(scrolled, [1840], "scroll is restored once, not on every later visit");
});

test("only the directory page itself is ever returned to", () => {
  const { store } = fakeWindow("/jobs");
  store.set("iopps:directory-return:jobs", JSON.stringify({ url: "https://attacker.example/jobs", scrollY: 0, at: Date.now() }));
  assert.equal(directoryReturnHref("jobs"), "/jobs");
  store.set("iopps:directory-return:jobs", JSON.stringify({ url: "/jobs/other-role?q=x", scrollY: 0, at: Date.now() }));
  assert.equal(directoryReturnHref("jobs"), "/jobs");
  store.set("iopps:directory-return:jobs", JSON.stringify({ url: "/jobs?q=old", scrollY: 0, at: Date.now() - 3 * 60 * 60 * 1000 }));
  assert.equal(directoryReturnHref("jobs"), "/jobs", "an old search is not reused");
  store.set("iopps:directory-return:jobs", "not json");
  assert.equal(directoryReturnHref("jobs"), "/jobs");
});

test("works without storage", () => {
  (globalThis as Record<string, unknown>).window = { location: { pathname: "/jobs", search: "?q=x" }, scrollY: 10, scrollTo() {}, get sessionStorage() { throw new Error("blocked"); } };
  rememberDirectoryPosition("jobs");
  assert.equal(directoryReturnHref("jobs"), "/jobs");
  delete (globalThis as Record<string, unknown>).window;
  assert.equal(directoryReturnHref("jobs"), "/jobs");
});
