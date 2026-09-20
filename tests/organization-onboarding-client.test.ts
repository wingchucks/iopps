import test from "node:test";
import assert from "node:assert/strict";

import {
  loadOrganizationOnboardingProfile,
  saveOrganizationOnboardingProgress,
  uploadOrganizationOnboardingLogo,
} from "../src/lib/organization-onboarding-client.ts";

test("onboarding loads the authenticated assigned organization instead of the account UID", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return Response.json({ org: { id: "assigned-organization", name: "Assigned organization", description: "Existing profile", type: "business", location: { city: "Regina", province: "Saskatchewan" } } });
  }) as typeof fetch;
  const organization = await loadOrganizationOnboardingProfile("different-admin-uid-token", { fetchImpl });
  assert.equal(organization?.id, "assigned-organization");
  assert.equal(organization?.description, "Existing profile");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, "/api/employer/dashboard");
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, "Bearer different-admin-uid-token");
  assert.equal(calls[0].init?.cache, "no-store");
});

test("onboarding distinguishes a missing profile from a failed or unauthorized load", async () => {
  assert.equal(await loadOrganizationOnboardingProfile("token", { fetchImpl: (async () => Response.json({ org: null })) as typeof fetch }), null);
  for (const status of [401, 403, 500]) {
    await assert.rejects(loadOrganizationOnboardingProfile("token", { fetchImpl: (async () => Response.json({ error: "Unable to load assigned organization" }, { status })) as typeof fetch }), /Unable to load assigned organization/);
  }
});

test("onboarding logo upload uses the authenticated same-origin API", async () => {
  let request: { input: RequestInfo | URL; init?: RequestInit } | null = null;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    request = { input, init };
    return Response.json({ url: "https://storage.example.com/sha-logo.png" });
  }) as typeof fetch;

  const file = new File([new Uint8Array([1, 2, 3])], "sha-logo.png", { type: "image/png" });
  const result = await uploadOrganizationOnboardingLogo(file, "token-123", { fetchImpl });

  assert.equal(result.url, "https://storage.example.com/sha-logo.png");
  assert.equal(request?.input, "/api/org/upload");
  assert.equal(request?.init?.method, "POST");
  assert.equal((request?.init?.headers as Record<string, string>).Authorization, "Bearer token-123");
  assert.ok(request?.init?.body instanceof FormData);
  assert.equal((request?.init?.body as FormData).get("slot"), "logo");
});

test("onboarding progress uses the authenticated server profile API", async () => {
  let request: { input: RequestInfo | URL; init?: RequestInit } | null = null;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    request = { input, init };
    return Response.json({ success: true });
  }) as typeof fetch;

  await saveOrganizationOnboardingProgress(
    { description: "Saskatchewan health careers", location: { city: "Regina", province: "Saskatchewan" } },
    "token-456",
    { fetchImpl },
  );

  assert.equal(request?.input, "/api/employer/profile");
  assert.equal(request?.init?.method, "PUT");
  assert.equal((request?.init?.headers as Record<string, string>).Authorization, "Bearer token-456");
  assert.deepEqual(JSON.parse(String(request?.init?.body)), {
    description: "Saskatchewan health careers",
    location: { city: "Regina", province: "Saskatchewan" },
  });
});

test("onboarding API errors are surfaced instead of leaving Saving active", async () => {
  const fetchImpl = (async () => Response.json({ error: "Profile could not be saved" }, { status: 500 })) as typeof fetch;

  await assert.rejects(
    () => saveOrganizationOnboardingProgress({ description: "test" }, "token", { fetchImpl }),
    /Profile could not be saved/,
  );
});
