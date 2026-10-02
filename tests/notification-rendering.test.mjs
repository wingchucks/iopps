import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, invalidChildren } from './helpers/component-harness.mjs';

const forged = [
  { id: 'map', userId: 'qa-a', read: false, type: '__proto__', title: { text: 'Map title' }, body: ['List body'], link: { href: '/profile' } },
  { id: 'external', userId: 'qa-a', read: false, type: 'system', title: 'IOPPS Security', body: 'Verify your account', link: 'https://evil.example/login' },
  { id: 'protocol-relative', userId: 'qa-a', read: false, type: 'toString', title: 'Protocol relative', link: '//evil.example' },
  { id: 'backslash', userId: 'qa-a', read: false, title: 'Backslash', link: '/\\evil.example' },
  { id: 'tab', userId: 'qa-a', read: false, title: 'Tab', link: '/\t/evil.example' },
  { id: 'dot-segments', userId: 'qa-a', read: false, title: 'Dot segments', link: '/..//evil.example' },
  { id: 'script', userId: 'qa-a', read: false, title: 'Script', link: 'javascript:alert(1)' },
  { id: 'internal', userId: 'qa-a', read: false, type: 'job_match', title: 'Internal', body: 'Fictional role', link: '/jobs/fictional-role?from=notification#apply' },
];

for (const [name, path, directComponent, expectedLinks] of [
  ['notification history', 'src/app/notifications/page.tsx', false, ['/jobs/fictional-role?from=notification#apply']],
  ['notification bell', 'src/components/NotificationBell.tsx', true, ['/jobs/fictional-role?from=notification#apply', '/notifications']],
]) test(`${name} renders forged records as unlinked plain text and follows only same-site paths`, async () => {
  const marked = [];
  const h = harness(path, {
    '@/lib/use-current-time': { useCurrentTime: () => 0 },
    '@/lib/use-notifications': { useNotifications: () => ({ notifications: forged, loading: false, error: '', unreadCount: forged.length, actionError: '', busy: false, retry() {}, markRead: async row => { marked.push(row.id); return false; } }) },
  }, directComponent);
  h.render();
  if (directComponent) { h.nodes().find(node => node.type === 'button' && node.props['aria-label']?.startsWith('Notifications')).props.onClick(); h.render(); }
  assert.deepEqual(invalidChildren(h.nodes()), []);
  assert.deepEqual(h.nodes().filter(node => node.type === 'next/link').map(node => node.props.href), expectedLinks);
  assert.doesNotMatch(JSON.stringify(h.nodes().map(node => node.props?.href ?? null)), /evil|javascript/);
  assert.doesNotMatch(h.text(), /Map title|List body/);
  // Unlinked forged records still mark read when activated, without navigating anywhere.
  await h.nodes().find(node => node.props?.onClick && JSON.stringify(node.props.children).includes('IOPPS Security')).props.onClick();
  assert.deepEqual(marked, ['external']);
});
