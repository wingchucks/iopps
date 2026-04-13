import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function resolvePlaywrightModuleUrl() {
  const candidatePackageRoots = new Set();
  const cwd = process.cwd();

  for (let dir = cwd; ; dir = path.dirname(dir)) {
    candidatePackageRoots.add(path.join(dir, "package.json"));
    const parent = path.dirname(dir);
    if (parent === dir) break;
  }

  const parentDir = path.dirname(cwd);
  if (fs.existsSync(parentDir)) {
    for (const entry of fs.readdirSync(parentDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      candidatePackageRoots.add(path.join(parentDir, entry.name, "package.json"));
    }
  }

  for (const packageJsonPath of candidatePackageRoots) {
    if (!fs.existsSync(packageJsonPath)) continue;

    try {
      const requireFrom = createRequire(pathToFileURL(packageJsonPath));
      const resolved = requireFrom.resolve("@playwright/test");
      return pathToFileURL(resolved).href;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    'Could not resolve "@playwright/test". Run "npm install" in this repo before running the production smoke test.',
  );
}

const playwrightModule = await import(resolvePlaywrightModuleUrl());
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;

if (!chromium) {
  throw new Error('Resolved Playwright package did not expose "chromium".');
}

const config = {
  baseUrl: process.env.QA_BASE_URL || "https://iopps.ca",
  email: process.env.QA_EMAIL || "hello@northernlightsconsulting.ca",
  password: process.env.QA_PASSWORD || "TestIOPPS2025!",
  qaJobTitle: process.env.QA_JOB_TITLE || "QA - Standard Job",
  qaJobSlug: process.env.QA_JOB_SLUG || "qa-standard-job-northern-lights",
  qaExpectedCity: process.env.QA_EXPECTED_CITY || "Saskatoon",
  qaExpectedProvince: process.env.QA_EXPECTED_PROVINCE || "SK",
  publicSearchTerm: process.env.QA_PUBLIC_SEARCH || "Westland",
  publicJobSlug: process.env.QA_PUBLIC_JOB_SLUG || "senior-insurance-advisor",
  publicExpectedLocation: process.env.QA_PUBLIC_LOCATION || "Rimbey, AB",
  publicExpectedApplyHost: process.env.QA_PUBLIC_APPLY_HOST || "jobs.dayforcehcm.com",
  headed: process.env.QA_HEADED === "true",
  slowMo: Number.parseInt(process.env.QA_SLOW_MO || "0", 10) || 0,
  timeoutMs: Number.parseInt(process.env.QA_TIMEOUT_MS || "30000", 10) || 30000,
};

const artifactsDir = path.resolve("output", "playwright");
const failureScreenshot = path.join(artifactsDir, "qa-production-smoke-failure.png");

function logStep(name, details) {
  console.log(`${name}: ${details}`);
}

function fail(message) {
  throw new Error(message);
}

async function ensureVisible(locator, message) {
  await locator.waitFor({ state: "visible", timeout: config.timeoutMs }).catch(() => {
    fail(message);
  });
}

async function main() {
  fs.mkdirSync(artifactsDir, { recursive: true });

  const browser = await chromium.launch({
    headless: !config.headed,
    slowMo: config.slowMo,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  const summary = {
    baseUrl: config.baseUrl,
    employerLoginUrl: "",
    qaEditUrl: "",
    publicJobUrl: "",
    applyHref: "",
  };

  try {
    logStep("open", `${config.baseUrl}/login`);
    await page.goto(`${config.baseUrl}/login`, {
      waitUntil: "domcontentloaded",
      timeout: config.timeoutMs,
    });

    await page.getByRole("textbox", { name: "you@example.com" }).fill(config.email);
    await page.getByRole("textbox", { name: "Enter your password" }).fill(config.password);

    logStep("login", config.email);
    await Promise.all([
      page.waitForURL(/\/org\/dashboard(?:$|\?)/, { timeout: config.timeoutMs }),
      page.getByRole("button", { name: "Sign In" }).click(),
    ]);
    summary.employerLoginUrl = page.url();

    if (!summary.employerLoginUrl.includes("/org/dashboard")) {
      fail(`Expected employer dashboard after login, got ${summary.employerLoginUrl}`);
    }

    logStep("jobs-dashboard", `${config.baseUrl}/org/dashboard/jobs`);
    await page.goto(`${config.baseUrl}/org/dashboard/jobs`, {
      waitUntil: "domcontentloaded",
      timeout: config.timeoutMs,
    });

    await ensureVisible(
      page.getByRole("heading", { name: config.qaJobTitle }),
      `QA job "${config.qaJobTitle}" was not visible on the jobs dashboard.`,
    );

    const editLink = page.locator(`a[href="/org/dashboard/jobs/${config.qaJobSlug}/edit"]`).first();
    await ensureVisible(
      editLink,
      `Expected Edit link for QA job slug "${config.qaJobSlug}" was not found.`,
    );

    const editHref = await editLink.getAttribute("href");
    if (editHref !== `/org/dashboard/jobs/${config.qaJobSlug}/edit`) {
      fail(`Unexpected QA edit href: ${editHref}`);
    }

    logStep("edit-click", editHref);
    await Promise.all([
      page.waitForURL(`**/org/dashboard/jobs/${config.qaJobSlug}/edit`, {
        timeout: config.timeoutMs,
      }),
      editLink.click(),
    ]);

    summary.qaEditUrl = page.url();
    await ensureVisible(
      page.getByRole("heading", { name: "Edit Job Posting" }),
      "Edit Job Posting heading did not load.",
    );

    const titleValue = await page.getByPlaceholder("e.g. Senior Software Developer").inputValue();
    const cityValue = await page.getByPlaceholder("e.g. Toronto").inputValue();
    const provinceValue = await page.getByPlaceholder("e.g. ON").inputValue();

    if (titleValue !== config.qaJobTitle) {
      fail(`Expected QA job title "${config.qaJobTitle}", got "${titleValue}"`);
    }
    if (cityValue !== config.qaExpectedCity) {
      fail(`Expected QA job city "${config.qaExpectedCity}", got "${cityValue}"`);
    }
    if (provinceValue !== config.qaExpectedProvince) {
      fail(`Expected QA job province "${config.qaExpectedProvince}", got "${provinceValue}"`);
    }

    logStep("public-jobs", `${config.baseUrl}/jobs`);
    await page.goto(`${config.baseUrl}/jobs`, {
      waitUntil: "domcontentloaded",
      timeout: config.timeoutMs,
    });

    const searchInput = page.getByPlaceholder("Search job titles, employers, locations...");
    await ensureVisible(searchInput, "Public jobs search input was not visible.");
    await searchInput.fill(config.publicSearchTerm);
    await page.waitForTimeout(1500);

    const publicJobCard = page.locator(`a[href="/jobs/${config.publicJobSlug}"]`).first();
    await ensureVisible(
      publicJobCard,
      `Public job card for "${config.publicJobSlug}" was not visible after search.`,
    );

    const cardText = await publicJobCard.innerText();
    if (!cardText.includes(config.publicExpectedLocation)) {
      fail(
        `Expected public job card to include "${config.publicExpectedLocation}", got "${cardText}"`,
      );
    }

    await Promise.all([
      page.waitForURL(`**/jobs/${config.publicJobSlug}`, { timeout: config.timeoutMs }),
      publicJobCard.click(),
    ]);

    summary.publicJobUrl = page.url();
    await page.waitForFunction(
      (expectedLocation) => document.body.innerText.includes(expectedLocation),
      config.publicExpectedLocation,
      { timeout: config.timeoutMs },
    ).catch(() => {
      fail(`Expected job detail page to include "${config.publicExpectedLocation}".`);
    });
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes(config.publicExpectedLocation)) {
      fail(`Expected job detail page to include "${config.publicExpectedLocation}".`);
    }

    const applyLink = page.getByRole("link", { name: /Apply Now/i }).first();
    await ensureVisible(applyLink, "Apply Now link was not visible on the public job detail page.");
    summary.applyHref = (await applyLink.getAttribute("href")) || "";

    if (!summary.applyHref.includes(config.publicExpectedApplyHost)) {
      fail(
        `Expected Apply Now href to include "${config.publicExpectedApplyHost}", got "${summary.applyHref}"`,
      );
    }

    console.log(JSON.stringify({ ok: true, summary }, null, 2));
  } catch (error) {
    try {
      await page.screenshot({ path: failureScreenshot, fullPage: true });
    } catch {
      // Ignore screenshot failures while reporting the primary error.
    }

    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          screenshot: failureScreenshot,
          summary,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

await main();
