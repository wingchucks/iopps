import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

function loadMiddleware() {
  const exports: { middleware?: (req: NextRequest) => Response } = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/middleware.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, Date, process: { env: {} },
    require: (id: string) => {
      if (id === "next/server") return { NextResponse };
      if (id === "jose") return { decodeJwt };
      if (id === "./lib/launch-maintenance") return { maintenanceResponse: () => null };
      throw new Error(id);
    },
  });
  return exports.middleware!;
}

// Middleware uses claims for navigation only; APIs verify credentials separately.
function session(emailVerified: boolean) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + 60,
    email_verified: emailVerified, firebase: { sign_in_provider: "password" },
  })).toString("base64url");
  return `__session=${header}.${payload}.test`;
}

test("existing sessions reach login account routing instead of being forced into the feed", () => {
  const response = loadMiddleware()(new NextRequest("https://iopps.ca/login?redirect=%2Forg%2Fdashboard", {
    headers: { cookie: session(true) },
  }));
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("x-middleware-next"), "1");
});

test("sign-in and verification preserve the requested page and query", () => {
  const route = "/org/dashboard/jobs/new?from=business";
  const middleware = loadMiddleware();
  const anonymous = middleware(new NextRequest(`https://iopps.ca${route}`));
  assert.equal(new URL(anonymous.headers.get("location")!).searchParams.get("redirect"), route);
  const unverified = middleware(new NextRequest(`https://iopps.ca${route}`, {
    headers: { cookie: session(false) },
  }));
  assert.equal(new URL(unverified.headers.get("location")!).searchParams.get("next"), route);
});

test("organization signup can resume after verification without sending the user to the feed", () => {
  const middleware = loadMiddleware();
  const resumed = middleware(new NextRequest("https://iopps.ca/signup?resume=organization&type=employer", {
    headers: { cookie: session(true) },
  }));
  assert.equal(resumed.headers.get("x-middleware-next"), "1");
  const existing = middleware(new NextRequest("https://iopps.ca/signup?intent=hiring", {
    headers: { cookie: session(true) },
  }));
  assert.equal(existing.headers.get("location"), "https://iopps.ca/login?intent=hiring");
});
