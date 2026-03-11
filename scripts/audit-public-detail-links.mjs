import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const defaultBaseUrl = process.env.AUDIT_BASE_URL || 'https://iopps.ca';
const outputPath = path.join(repoRoot, 'output', 'public-link-audit.json');

function normalizeText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

function buildJobItems(items) {
  return items.map((item) => ({
    kind: 'job',
    id: item.id,
    title: item.title,
    url: `${defaultBaseUrl}/jobs/${item.slug || item.id}`,
    descriptionLength: normalizeText(item.description).length,
    metadata: {
      source: item.source || 'unknown',
      employerName: item.employerName || '',
      featured: Boolean(item.featured),
    },
  }));
}

function buildEventItems(items) {
  return items.map((item) => {
    const type = String(item.type || item.eventType || '').toLowerCase();
    return {
      kind: type.includes('conference') ? 'conference' : 'event',
      id: item.id,
      title: item.title,
      url: `${defaultBaseUrl}/events/${item.slug || item.id || slugify(item.title)}`,
      descriptionLength: normalizeText(item.description).length,
      metadata: {
        type: item.type || item.eventType || 'event',
        featured: Boolean(item.featured),
      },
    };
  });
}

function buildScholarshipItems(items) {
  return items.map((item) => ({
    kind: 'scholarship',
    id: item.id,
    title: item.title,
    url: `${defaultBaseUrl}/scholarships/${item.slug || item.id}`,
    descriptionLength: normalizeText(item.description).length,
    metadata: {
      organization: item.orgName || item.organization || '',
    },
  }));
}

function classifyFailure(bodyText, statusCode) {
  const text = bodyText.toLowerCase();
  if (statusCode >= 400) return `http_${statusCode}`;
  if (text.includes('job not found')) return 'job_not_found';
  if (text.includes('event not found')) return 'event_not_found';
  if (text.includes('scholarship not found')) return 'scholarship_not_found';
  if (text.includes('404')) return 'contains_404';
  if (text.includes('something went wrong')) return 'generic_error';
  return null;
}

function classifyQualityWarning(item) {
  if (item.kind === 'job' && item.descriptionLength < 120) {
    return 'short_job_description';
  }

  if ((item.kind === 'event' || item.kind === 'conference') && item.descriptionLength < 120) {
    return 'short_event_description';
  }

  if (item.kind === 'scholarship' && item.descriptionLength < 120) {
    return 'short_scholarship_description';
  }

  return null;
}

function summarizeCounts(items) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      summary[item.kind] += 1;
      return summary;
    },
    {
      total: 0,
      job: 0,
      event: 0,
      conference: 0,
      scholarship: 0,
    },
  );
}

async function main() {
  const [jobsJson, eventsJson, scholarshipsJson] = await Promise.all([
    fetchJson(`${defaultBaseUrl}/api/jobs`),
    fetchJson(`${defaultBaseUrl}/api/events`),
    fetchJson(`${defaultBaseUrl}/api/scholarships`),
  ]);

  const items = [
    ...buildJobItems(jobsJson.jobs || []),
    ...buildEventItems(eventsJson.events || []),
    ...buildScholarshipItems(scholarshipsJson.scholarships || []),
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const failures = [];
  const qualityWarnings = [];

  for (const [index, item] of items.entries()) {
    try {
      const response = await page.goto(item.url, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      await page.waitForTimeout(200);

      const bodyText = await page.locator('body').innerText({ timeout: 10000 });
      const statusCode = response?.status() ?? 0;
      const failure = classifyFailure(bodyText, statusCode);

      if (failure) {
        failures.push({
          kind: item.kind,
          id: item.id,
          title: item.title,
          url: item.url,
          statusCode,
          failure,
          metadata: item.metadata,
        });
      } else {
        const qualityWarning = classifyQualityWarning(item);
        if (qualityWarning) {
          qualityWarnings.push({
            kind: item.kind,
            id: item.id,
            title: item.title,
            url: item.url,
            statusCode,
            qualityWarning,
            descriptionLength: item.descriptionLength,
            metadata: item.metadata,
          });
        }
      }
    } catch (error) {
      failures.push({
        kind: item.kind,
        id: item.id,
        title: item.title,
        url: item.url,
        statusCode: 0,
        failure: `exception:${error.message}`,
        metadata: item.metadata,
      });
    }

    if ((index + 1) % 25 === 0) {
      console.log(`Checked ${index + 1}/${items.length}`);
    }
  }

  await browser.close();

  const report = {
    auditedAt: new Date().toISOString(),
    baseUrl: defaultBaseUrl,
    counts: summarizeCounts(items),
    failures,
    qualityWarnings,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    auditedAt: report.auditedAt,
    baseUrl: report.baseUrl,
    counts: report.counts,
    failureCount: failures.length,
    qualityWarningCount: qualityWarnings.length,
  }, null, 2));

  console.log(`Report written to ${outputPath}`);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
