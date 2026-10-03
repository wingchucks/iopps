import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

// Fictional identities; Firebase is replaced by in-memory stand-ins.
class AccountAccessError extends Error { status = 403; }
class EmployerApiError extends Error { constructor(status, message) { super(message); this.status = status; } }

function accountRoute({ token = {}, userData = {}, member = true, organization = null }) {
  let employerChecks = 0;
  const route = sourceModule('src/app/api/auth/account/route.ts', { mocks: {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/firebase-admin': {
      getAdminAuth: () => ({ verifyIdToken: async () => ({ uid: 'fictional-staff', ...token }) }),
      getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: member, data: () => ({}) }) }) }) }),
    },
    '@/lib/server/account-access': { AccountAccessError, assertUserCanAccessApp: async () => ({ userData }) },
    '@/lib/server/employer-auth': { EmployerApiError, requireEmployerContext: async () => {
      employerChecks++;
      if (organization instanceof Error) throw organization;
      if (!organization) throw new EmployerApiError(403, 'Not an employer');
      return { organizationData: organization, employerData: {} };
    } },
  } });
  return {
    async destination() {
      const response = await route.GET(new Request('https://www.iopps.ca/api/auth/account', { headers: { authorization: 'Bearer fictional' } }));
      assert.equal(response.status, 200);
      return (await response.json()).destination;
    },
    get employerChecks() { return employerChecks; },
  };
}
const readyOrganization = { type: 'employer', name: 'Fictional Org', description: 'A fictional organization', logoUrl: 'https://example.invalid/logo.png', contactEmail: 'org@example.invalid', publicContactEmail: 'org@example.invalid' };

test('only administrators the admin APIs accept are sent to /admin', async () => {
  assert.equal(await accountRoute({ token: { admin: true, role: 'admin' }, userData: { role: 'admin', claimsValidAfter: 1 } }).destination(), '/admin');
  assert.equal(await accountRoute({ token: { admin: true } }).destination(), '/admin', 'legacy claim without a freshness marker');
  // A stale admin claim after a demotion, or a profile role without a signed claim, is not an administrator.
  assert.equal(await accountRoute({ token: { admin: true, role: 'admin' }, userData: { role: 'community', claimsValidAfter: 1 } }).destination(), '/feed');
  assert.equal(await accountRoute({ userData: { role: 'admin' } }).destination(), '/feed');
});

test('moderators are routed to their own or their organization workspace, never the admin panel', async () => {
  const personal = accountRoute({ token: { role: 'moderator' }, userData: { role: 'moderator' } });
  assert.equal(await personal.destination(), '/feed');
  assert.equal(personal.employerChecks, 1);
  const owner = accountRoute({ token: { role: 'moderator', employerId: 'fictional-staff' }, userData: { role: 'moderator' }, organization: readyOrganization });
  assert.equal(await owner.destination(), '/org/dashboard');
});

function adminLayout(role) {
  const routes = [], effects = [];
  const layout = sourceModule('src/app/admin/layout.tsx', { mocks: {
    react: { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useEffect: fn => effects.push(fn), useCallback: fn => fn, useRef: current => ({ current }) },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' },
    'next/navigation': { useRouter: () => ({ replace: url => routes.push(url) }), usePathname: () => '/admin' },
    'next/link': { default: 'a' },
    'react-hot-toast': { Toaster: 'toaster' },
    '@/components/auth/AuthProvider': { useAuth: () => ({ user: { uid: 'fictional-staff', displayName: 'Fictional', email: 'staff@example.invalid', getIdToken: async () => 'token' }, role, loading: false, signOut: async () => {} }) },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  }, globals: { document: { body: { style: {} } } } });
  const tree = layout.default({ children: 'ADMIN_ONLY_CONTENT' });
  for (const effect of effects) effect();
  return { tree, routes, text: JSON.stringify(tree) };
}

test('the admin layout admits administrators only', () => {
  const moderator = adminLayout('moderator');
  assert.deepEqual(moderator.routes, ['/']);
  assert.ok(!moderator.text.includes('ADMIN_ONLY_CONTENT'));
  const admin = adminLayout('admin');
  assert.deepEqual(admin.routes, []);
  assert.ok(admin.text.includes('ADMIN_ONLY_CONTENT'));
});
