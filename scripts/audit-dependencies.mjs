// CI dependency audit. Like `npm audit --audit-level=low`, it fails on any advisory at any
// severity, except the ones listed below. Each listed advisory has no patched release and
// reaches only development tooling. Production dependencies get no exceptions.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEV_ONLY_EXCEPTIONS = {
  // braces <=3.0.3, which is every release: stack exhaustion on deeply nested brace patterns.
  // Reached only through eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch,
  // which expands this repository's own lint patterns. Remove once a patched release ships.
  'GHSA-vfj7-8cjw-p6xm': 'braces, via eslint-config-next (lint only)',
};

const advisoryId = via => /GHSA(?:-[a-z0-9]{4}){3}/i.exec(via.url || '')?.[0] ?? String(via.source ?? via.title);

/** The advisories in an `npm audit --json` report. A failed or missing audit throws. */
export function advisories(report) {
  if (!report || typeof report !== 'object' || report.error || !report.vulnerabilities || typeof report.vulnerabilities !== 'object') {
    throw Error(`npm audit returned no report: ${JSON.stringify(report?.error ?? report)}`);
  }
  const found = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities)) {
    // String entries name the dependency that carries an advisory; the advisory itself is an object.
    for (const via of vulnerability.via ?? []) {
      if (via && typeof via === 'object') {
        const id = advisoryId(via);
        found.set(`${id} ${via.name}`, { id, name: via.name, severity: via.severity, title: via.title, url: via.url });
      }
    }
  }
  return [...found.values()];
}

/** Production advisories always fail. Others fail unless they are listed exceptions. */
export function auditResult(production, all, exceptions = DEV_ONLY_EXCEPTIONS) {
  const failures = new Map(advisories(production).map(advisory => [`${advisory.id} ${advisory.name}`, advisory]));
  const excepted = [];
  for (const advisory of advisories(all)) {
    const key = `${advisory.id} ${advisory.name}`;
    if (failures.has(key)) continue;
    if (Object.hasOwn(exceptions, advisory.id)) excepted.push(advisory);
    else failures.set(key, advisory);
  }
  const unused = Object.keys(exceptions).filter(id => !excepted.some(advisory => advisory.id === id));
  return { failures: [...failures.values()], excepted, unused };
}

function npmAudit(...args) {
  try {
    return JSON.parse(execFileSync('npm', ['audit', '--json', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] }));
  } catch (error) {
    // npm audit exits 1 when it finds advisories; its report is still on stdout.
    if (typeof error.stdout === 'string' && error.stdout.trim()) return JSON.parse(error.stdout);
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { failures, excepted, unused } = auditResult(npmAudit('--omit=dev'), npmAudit());
  for (const advisory of excepted) console.log(`Allowed in development tooling only: ${advisory.id} ${advisory.name} (${advisory.severity}) ${advisory.title}`);
  for (const id of unused) console.log(`::warning::${id} no longer appears in npm audit; remove it from scripts/audit-dependencies.mjs.`);
  for (const advisory of failures) console.error(`${advisory.id} ${advisory.name} (${advisory.severity}) ${advisory.title} ${advisory.url ?? ''}`);
  if (failures.length) {
    console.error(`npm audit found ${failures.length} advisories that need a fix.`);
    process.exitCode = 1;
  } else {
    console.log('npm audit: no advisories apart from the development-only exceptions above.');
  }
}
