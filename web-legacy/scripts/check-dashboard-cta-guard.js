#!/usr/bin/env node
/**
 * Dashboard CTA Role Leakage Guard
 *
 * This script ensures "My Dashboard" only appears in authorized files.
 * Run this in CI to prevent regression.
 *
 * ALLOWED FILES for "My Dashboard" string:
 * - components/auth/DashboardEntryCTA.tsx (the single source of truth)
 * - components/SiteHeader.tsx (properly role-gated)
 * - components/member/* (member-only pages)
 * - app/member/* (member-only pages)
 */

const fs = require('fs');
const path = require('path');

const SEARCH_PATTERN = /My Dashboard/g;

const ALLOWED_PATTERNS = [
  'components/auth/DashboardEntryCTA.tsx',
  'components/SiteHeader.tsx',
  'components/member/',
  'app/member/',
  'lib/auth-utils.ts',
];

const IGNORE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build'];

function getAllTsxFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        getAllTsxFiles(fullPath, files);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      files.push(fullPath);
    }
  }

  return files;
}

function searchFileForPattern(filePath, pattern) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const matches = [];

  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      matches.push({ lineNumber: index + 1, line: line.trim() });
    }
    // Reset regex lastIndex for next line
    pattern.lastIndex = 0;
  });

  return matches;
}

function main() {
  console.log('Checking for unauthorized "My Dashboard" usage...\n');

  const webDir = path.join(__dirname, '..');
  const files = getAllTsxFiles(webDir);

  const allowedMatches = [];
  const violations = [];

  for (const filePath of files) {
    const relativePath = path.relative(webDir, filePath).replace(/\\/g, '/');
    const matches = searchFileForPattern(filePath, SEARCH_PATTERN);

    if (matches.length > 0) {
      const isAllowed = ALLOWED_PATTERNS.some(pattern => relativePath.includes(pattern));

      for (const match of matches) {
        const entry = { file: relativePath, lineNumber: match.lineNumber, line: match.line };
        if (isAllowed) {
          allowedMatches.push(entry);
        } else {
          violations.push(entry);
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('ERROR: "My Dashboard" found in unauthorized files!');
    console.error('=======================================================\n');
    violations.forEach(v => {
      console.error(`  ${v.file}:${v.lineNumber}`);
      console.error(`    ${v.line}\n`);
    });
    console.error('\nRULE: "My Dashboard" should ONLY appear in:');
    console.error('  - components/auth/DashboardEntryCTA.tsx');
    console.error('  - components/SiteHeader.tsx');
    console.error('  - components/member/* (member-only components)');
    console.error('  - app/member/* (member-only pages)\n');
    console.error('If you need a dashboard CTA on a public page, use:');
    console.error('  import { DashboardEntryCTA } from "@/components/auth/DashboardEntryCTA";\n');
    process.exit(1);
  }

  console.log('Dashboard CTA guard passed - no unauthorized "My Dashboard" usage found.');

  if (allowedMatches.length > 0) {
    console.log(`\nFound ${allowedMatches.length} occurrence(s) in allowed locations:`);
    allowedMatches.forEach(m => {
      console.log(`  ${m.file}:${m.lineNumber}`);
    });
  }

  process.exit(0);
}

main();
