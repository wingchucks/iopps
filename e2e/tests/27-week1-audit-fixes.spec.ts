import { test, expect } from "@playwright/test";

// Regression coverage for the Week 1 audit fixes shipped in PR #131.
// Run only against isolated demo fixtures. Anonymous page reads can hydrate
// and update job records, so these are not safe production read-only probes.
//
// Coverage gaps intentionally left for follow-up once authenticated
// test fixtures exist:
//   - C-3 second half (auto-fire save after returning from login)
//   - C-4 (role-based post-login redirect for admin/employer/member)
//   - C-6 (Use my IOPPS Profile toggle behavior in the signed-in apply flow)


test.describe("C-5 — signup validation surfaces per-field errors", () => {
  test.beforeEach(async ({ page }) => {
    const appPort = new URL(process.env.TEST_BASE_URL!).port;
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      return url.hostname === "127.0.0.1" && [appPort, "8080", "9099", "9199"].includes(url.port) ? route.continue() : route.abort();
    });
  });
  test("invalid email shows alert under the email field", async ({ page }) => {
    await page.goto("/signup");
    // Use the current semantic role selector.
    await page.getByRole("button", { name: /Individual/ }).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await page.locator("#name").fill("Test User");
    await page.locator("#email").fill("not-a-real-email");
    await page.locator("#password").fill("password1234");
    await page.locator("#confirmPassword").fill("password1234");

    await page.locator("#signup-consent").check();
    await page.getByRole("button", { name: /create account/i }).click();

    // The fix renders an error in role="alert" with id="<field>-error".
    const emailError = page.locator("#email-error");
    await expect(emailError).toBeVisible();
    await expect(emailError).toHaveAttribute("role", "alert");
    await expect(page.locator("#email")).toHaveAttribute("aria-invalid", "true");
  });

  test("mismatched passwords show alert under confirm field", async ({ page }) => {
    await page.goto("/signup");
    // Use the current semantic role selector.
    await page.getByRole("button", { name: /Individual/ }).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await page.locator("#name").fill("Test User");
    await page.locator("#email").fill("test@example.com");
    await page.locator("#password").fill("password1234");
    await page.locator("#confirmPassword").fill("different-password");

    await page.locator("#signup-consent").check();
    await page.getByRole("button", { name: /create account/i }).click();

    const confirmError = page.locator("#confirmPassword-error");
    await expect(confirmError).toBeVisible();
    await expect(confirmError).toHaveAttribute("role", "alert");
    await expect(page.locator("#confirmPassword")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("required fields use HTML5 constraints as a backstop", async ({ page }) => {
    await page.goto("/signup");
    // Use the current semantic role selector.
    await page.getByRole("button", { name: /Individual/ }).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.locator("#email")).toHaveAttribute("type", "email");
    await expect(page.locator("#email")).toHaveAttribute("required", "");
    await expect(page.locator("#password")).toHaveAttribute("minLength", "8");
    await expect(page.locator("#password")).toHaveAttribute(
      "autoComplete",
      "new-password",
    );
  });
});

test.describe("C-3 — anonymous Save routes to login with save intent", () => {
  test("clicking Save on a job sends anon visitor to /login with ?save=1", async ({
    page,
  }) => {
    // Find a real job slug from the listing page so this stays robust as
    // jobs roll over.
    await page.goto("/jobs");
    const firstJob = page.locator('a[href^="/jobs/"]').first();
    await expect(firstJob).toBeVisible();
    const jobHref = await firstJob.getAttribute("href");
    expect(jobHref).toBeTruthy();

    await page.goto(jobHref!);

    // The Save action lives on a button with text "Save" (toggles to
    // "Saved" once active). Anonymous clicks should bounce to /login.
    const saveButton = page
      .getByRole("button", { name: /Save (Job|Event)/i })
      .first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    await expect(page).toHaveURL(/\/login\?/);
    const loginUrl = new URL(page.url());
    const redirect = loginUrl.searchParams.get("redirect");
    expect(redirect, "login should preserve the original page as ?redirect=").toBeTruthy();
    expect(redirect).toContain(jobHref!);
    expect(redirect).toContain("save=1");
  });

  test("clicking Save on an event sends anon visitor to /login with ?save=1", async ({
    page,
  }) => {
    await page.goto("/events");
    const firstEvent = page.locator('a[href^="/events/"]').first();
    await expect(firstEvent).toBeVisible();
    const eventHref = await firstEvent.getAttribute("href");
    expect(eventHref).toBeTruthy();

    await page.goto(eventHref!);

    const saveButton = page
      .getByRole("button", { name: /Save (Job|Event)/i })
      .first();
    if (!(await saveButton.isVisible().catch(() => false))) {
      test.skip(true, "Event detail page did not render a Save button");
      return;
    }
    await saveButton.click();

    await expect(page).toHaveURL(/\/login\?/);
    const loginUrl = new URL(page.url());
    const redirect = loginUrl.searchParams.get("redirect");
    expect(redirect).toBeTruthy();
    expect(redirect).toContain(eventHref!);
    expect(redirect).toContain("save=1");
  });
});

test.describe("H-1 — Save buttons render the bookmark glyph, not raw entity", () => {
  test("event detail Save button does not contain literal '&#128278;'", async ({
    page,
  }) => {
    await page.goto("/events");
    const firstEvent = page.locator('a[href^="/events/"]').first();
    if (!(await firstEvent.isVisible().catch(() => false))) {
      test.skip(true, "No events available to test");
      return;
    }
    const eventHref = await firstEvent.getAttribute("href");
    await page.goto(eventHref!);

    const body = await page.locator("body").innerText();
    expect(body).not.toContain("&#128278;");
  });
});
