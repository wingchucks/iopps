import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const routes = ["seed-collection", "cleanup", "seed-school", "batch-update"];
const credentials: HeadersInit[] = [
  {},
  { authorization: "Bearer undefined" },
  { authorization: "Bearer null" },
  { authorization: "Bearer fictional-cron-secret" },
  { authorization: "Bearer fictional-admin-token" },
  { "x-cron-secret": "fictional-cron-secret" },
  { "x-cron-secret": "undefined" },
  { authorization: "Bearer fictional-admin-token", "x-cron-secret": "fictional-cron-secret" },
];

for (const route of routes) {
  test(`retired ${route} rejects every credential without loading services or processing mutations`, async () => {
    for (const configuredSecret of [undefined, "fictional-cron-secret"]) {
      const exports: { POST?: (request: Request) => Promise<Response> } = {};
      const source = readFileSync(`src/app/api/admin/${route}/route.ts`, "utf8");
      vm.runInNewContext(
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
        {
          exports,
          Response,
          process: { env: { CRON_SECRET: configuredSecret } },
          require: (id: string) => { throw new Error(`Retired route must not load a service: ${id}`); },
          fetch: () => { throw new Error("Retired route must not make network requests"); },
        },
      );
      assert.equal(typeof exports.POST, "function");
      for (const headers of credentials) {
        const request = new Request(`https://example.invalid/api/admin/${route}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            collection: "users", docId: "other-user", id: "other-organization",
            data: { role: "admin" }, field: "role", value: "member", action: "delete",
            updates: [{ collection: "users", id: "other-user", data: { role: "admin" } }],
          }),
        });
        request.json = async () => { throw new Error("Retired route must not process mutation input"); };
        const response = await exports.POST!(request);
        assert.equal(response.status, 410);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal((await response.json()).code, "ENDPOINT_RETIRED");
      }
    }
  });
}
