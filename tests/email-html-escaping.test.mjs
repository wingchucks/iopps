import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Actual email modules with a fictional provider transport. No network or credentials.
function compile(file) {
  return ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
}
function loadEmail() {
  const sent = [];
  const loaded = { exports: {} };
  vm.runInNewContext(compile('src/lib/email.ts'), {
    module: loaded, exports: loaded.exports, console: { error() {} },
    process: { env: { RESEND_API_KEY: 'fictional-unit-key', ADMIN_NOTIFICATION_EMAILS: 'owner@example.invalid' } },
    require: id => {
      if (id === 'resend') return { Resend: class { emails = { send: async message => { sent.push(message); return { data: { id: 'fictional-id' } }; } }; } };
      if (id === '@/lib/auth-verification-email') return { buildAccountVerificationEmailContent: () => '' };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return { email: loaded.exports, sent };
}
function loadTemplates() {
  const exports = {};
  vm.runInNewContext(compile('src/lib/email-templates.ts'), { exports });
  return exports;
}

const LINK = '<a href="https://evil.example">Approve pending payout</a>';
const IMAGE = '<img src=x onerror="alert(1)">';
const HEADER = 'Fictional Name\r\nBcc: victim@example.invalid';
const anchors = html => [...html.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map(match => match[1]);

function assertInert(html) {
  assert.doesNotMatch(html, /<a href="https:\/\/evil\.example"/);
  assert.doesNotMatch(html, /<img /);
  assert.ok(!anchors(html).some(href => href.includes('evil.example')), 'no attacker-controlled link');
  assert.ok(html.includes('&lt;a href=&quot;https://evil.example&quot;&gt;Approve pending payout&lt;/a&gt;') || html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
}

test('admin new-signup email renders a user-chosen name as text, not a clickable link', async () => {
  const { email, sent } = loadEmail();
  for (const type of ['community', 'employer', 'upgrade']) {
    await email.sendAdminNewSignup({ name: LINK, email: 'member"@example.invalid', type, orgName: type === 'community' ? undefined : IMAGE });
  }
  assert.equal(sent.length, 3);
  for (const message of sent) {
    assertInert(message.html);
    assert.ok(message.html.includes('&lt;a href=&quot;https://evil.example&quot;&gt;Approve pending payout&lt;/a&gt;'));
    assert.ok(message.html.includes('member&quot;@example.invalid'));
    assert.deepEqual(anchors(message.html), ['https://www.iopps.ca/admin/users', 'https://www.iopps.ca']);
  }
  assert.ok(sent[1].html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
});

test('employer welcome and subscription confirmation escape names, plans and links', async () => {
  const { email, sent } = loadEmail();
  await email.sendEmployerWelcome({ email: 'owner@example.invalid', contactName: LINK, orgName: IMAGE, verificationLink: 'https://www.iopps.ca/auth/action?mode=verifyEmail&oobCode=fictional"><b>' });
  await email.sendSubscriptionConfirmation({ email: 'owner@example.invalid', contactName: LINK, orgName: IMAGE, planName: '<script>alert(1)</script>', amount: 100, gst: 5 });
  for (const message of sent) assertInert(message.html);
  assert.ok(sent[0].html.includes('href="https://www.iopps.ca/auth/action?mode=verifyEmail&amp;oobCode=fictional&quot;&gt;&lt;b&gt;"'));
  assert.doesNotMatch(sent[1].html, /<script>/);
  assert.ok(sent[1].html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(sent[1].html.includes('$105.00 CAD'));
});

test('every subject is a single header line while ordinary subjects stay exact', async () => {
  const { email, sent } = loadEmail();
  await email.sendAdminNewSignup({ name: HEADER, email: 'member@example.invalid', type: 'community' });
  await email.sendAdminNewSignup({ name: 'Member', email: 'member@example.invalid', type: 'employer', orgName: HEADER });
  await email.sendEmployerWelcome({ email: 'owner@example.invalid', contactName: 'Owner', orgName: HEADER });
  await email.sendSubscriptionConfirmation({ email: 'owner@example.invalid', contactName: 'Owner', orgName: 'Org', planName: HEADER, amount: 1, gst: 0 });
  await email.sendApplicationNotification({ employerEmail: 'owner@example.invalid', employerName: 'Org', applicantName: HEADER, jobTitle: 'Role\nX-Injected: yes', jobId: 'job', orgId: 'org' });
  await email.sendAdminContentPosted({ contentType: 'job', title: HEADER });
  await email.sendAdminPaymentNotification({ orgName: HEADER, contactName: 'Owner', email: 'owner@example.invalid', planName: 'Plan', amount: 1, gst: 0 });
  await email.sendMessageNotification({ to: 'member@example.invalid', subject: `New message from ${HEADER}`, html: 'Fictional' }, 'message-fictional');
  assert.equal(sent.length, 8);
  for (const message of sent) {
    assert.doesNotMatch(message.subject, /[\r\n]/);
    assert.match(message.subject, /Fictional Name Bcc: victim@example\.invalid|Role X-Injected: yes/);
  }
  assert.equal(sent[0].subject, '🙋 New Member: Fictional Name Bcc: victim@example.invalid');
  const plain = loadEmail();
  await plain.email.sendAccountPasswordResetEmail('member@example.invalid', 'https://example.invalid/reset');
  assert.equal(plain.sent[0].subject, 'Reset your IOPPS password');
});

test('member email templates escape every argument exactly once and keep their links', () => {
  const templates = loadTemplates();
  const cases = [
    ['welcomeEmail', [LINK], 'https://www.iopps.ca/jobs'],
    ['applicationStatusEmail', [LINK, IMAGE, 'reviewing'], 'https://www.iopps.ca/applications'],
    ['applicationStatusEmail', [LINK, IMAGE, '<b>custom</b>'], 'https://www.iopps.ca/applications'],
    ['newMessageEmail', [LINK, IMAGE], 'https://www.iopps.ca/messages'],
    ['eventReminderEmail', [LINK, IMAGE, '<i>Tomorrow</i>'], 'https://www.iopps.ca/events'],
    ['jobMatchEmail', [LINK, IMAGE, '<u>Org</u>'], 'https://www.iopps.ca/jobs'],
  ];
  for (const [name, args, destination] of cases) {
    const html = templates[name](...args);
    assertInert(html);
    assert.doesNotMatch(html, /<b>custom|<i>Tomorrow|<u>Org|&amp;lt;/);
    assert.deepEqual(anchors(html), [destination, 'https://www.iopps.ca']);
  }
  assert.ok(templates.applicationStatusEmail('Member', 'Job', 'constructor').includes('has been updated to "constructor"'));
});
