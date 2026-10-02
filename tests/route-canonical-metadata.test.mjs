import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

const component = { __esModule: true, default: ({ children }) => children ?? null };
const page = (file, names = []) => sourceModule(file, { mocks: {
  'next/link': component, 'next/image': component, 'next/font/google': { Geist: () => ({ variable: 'font' }) },
  './globals.css': {}, './opportunity.css': {}, './buttons.css': {},
  ...Object.fromEntries(names.map(name => [name, component])),
} });
const json = value => JSON.parse(JSON.stringify(value));

test('only the homepage declares the homepage canonical URL and share card', () => {
  const root = page('src/app/layout.tsx', ['@/components/SkipToContent', '@/components/AuthErrorBoundary', '@/components/SessionManager', '@/components/SignInNotice', '@/components/OrganizationSetupReminder', '@/components/AnalyticsTracker', '@/components/GoogleAnalytics', '@/lib/auth-context', '@/lib/theme-context', '@/lib/toast-context']).metadata;
  // Inherited by every route: only site-wide defaults, never a URL or the homepage title.
  assert.equal(root.alternates, undefined);
  assert.equal(root.openGraph.url, undefined);
  assert.equal(root.openGraph.title, undefined);
  assert.equal(root.twitter.title, undefined);
  assert.equal(json(root.openGraph.images)[0].url, 'https://www.iopps.ca/og-image.jpg');

  const home = page('src/app/page.tsx', ['@/components/OpportunityHeader', '@/components/PartnerShowcase', '@/components/ConferencePromotion', '@/components/landing/LandingLivePreview', '@/components/Footer']).metadata;
  assert.equal(home.alternates.canonical, '/');
  assert.equal(home.openGraph.url, 'https://www.iopps.ca');
  assert.equal(home.openGraph.title, 'IOPPS.CA — Empowering Indigenous Success');
  assert.equal(home.twitter.card, 'summary_large_image');

  // Pricing sets only its title and description, so it now has no canonical at all.
  const pricing = sourceModule('src/app/pricing/layout.tsx').metadata;
  assert.equal(pricing.alternates, undefined);
  assert.equal(pricing.openGraph, undefined);
});

test('the conference and business spotlight pages declare their own canonical metadata', () => {
  for (const [file, path, title, components] of [
    ['src/app/conference/page.tsx', '/conference', 'Indigenous Entrepreneurship Conference | IOPPS.ca', ['@/components/OpportunityHeader', '@/components/Footer']],
    ['src/app/indigenous-business-spotlight/page.tsx', '/indigenous-business-spotlight', 'Indigenous Business Spotlight | IOPPS.ca', ['@/components/Badge', '@/components/Button', '@/components/Card', '@/components/Footer', '@/components/ThemeToggle']],
  ]) {
    const { metadata } = page(file, components);
    assert.equal(metadata.alternates.canonical, `https://www.iopps.ca${path}`, file);
    assert.equal(metadata.openGraph.url, `https://www.iopps.ca${path}`, file);
    // An absolute title: no duplicated "| IOPPS" suffix from the root template.
    assert.deepEqual(json(metadata.title), { absolute: title }, file);
  }
});
