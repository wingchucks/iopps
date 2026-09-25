import test from 'node:test';
import assert from 'node:assert/strict';
import { profileFieldLimitError, PROFILE_TEXT_LIMITS } from '../src/lib/profile-fields.ts';
import { jobInputLimitError, JOB_DESCRIPTION_MAX, JOB_TITLE_MAX } from '../src/lib/server/job-input-limits.ts';

test('profile caps accept realistic and established long profiles, including syllabics', () => {
  const realistic = { displayName: 'ᐊᒥᐦᑯᐤ Éloïse Cardinal-Laplante', headline: 'Administrative Assistant | Treaty 6', bio: 'Tânisi! '.repeat(600), skillsText: 'Excel, Cree Translation', interests: ['jobs', 'events'], skills: ['Excel'], education: [{ school: 'First Nations University', degree: 'BA', field: 'Indigenous Studies', year: 2020 }] };
  assert.equal(profileFieldLimitError(realistic), null);
  // Established values the setup flow must keep accepting (round 5, L1).
  const established = { community: 'c'.repeat(301), location: 'l'.repeat(301), nation: 'n'.repeat(301), territory: 't'.repeat(301), languages: 'l'.repeat(1001), headline: 'h'.repeat(301), skillsText: 'Skill, '.repeat(400), bio: 'b'.repeat(6000), interests: Array.from({ length: 51 }, (_, i) => `legacy-${i}-` + 'i'.repeat(101)) };
  assert.equal(profileFieldLimitError(established), null);
  assert.equal(profileFieldLimitError({ bio: 'x'.repeat(PROFILE_TEXT_LIMITS.bio) }), null);
});

test('profile caps reject abusive sizes', () => {
  assert.equal(profileFieldLimitError({ bio: 'x'.repeat(PROFILE_TEXT_LIMITS.bio + 1) }), 'bio');
  assert.equal(profileFieldLimitError({ bio: 'x'.repeat(250000) }), 'bio');
  assert.equal(profileFieldLimitError({ displayName: 'ᐊ'.repeat(20000) }), 'displayName');
  assert.equal(profileFieldLimitError({ headline: 'x'.repeat(50000) }), 'headline');
  assert.equal(profileFieldLimitError({ interests: Array(201).fill('jobs') }), 'interests');
  assert.equal(profileFieldLimitError({ skills: ['x'.repeat(301)] }), 'skills');
  assert.equal(profileFieldLimitError({ skills: Array(1001).fill('x') }), 'skills');
  assert.equal(profileFieldLimitError({ skills: Array(400).fill('Skill') }), null);
  assert.equal(profileFieldLimitError({ education: Array(101).fill({ school: 'x' }) }), 'education');
  assert.equal(profileFieldLimitError({ openToWork: true, salaryRange: { min: 1, max: 2 } }), null);
});

test('profile caps reject other shapes for capped text and list fields', () => {
  assert.equal(profileFieldLimitError({ bio: { value: 'x'.repeat(250000) } }), 'bio');
  assert.equal(profileFieldLimitError({ bio: ['x'.repeat(250000)] }), 'bio');
  assert.equal(profileFieldLimitError({ displayName: 42 }), 'displayName');
  assert.equal(profileFieldLimitError({ interests: 'jobs' }), 'interests');
  assert.equal(profileFieldLimitError({ skills: [{ name: 'x'.repeat(250000) }] }), 'skills');
  assert.equal(profileFieldLimitError({ bio: null, resumeUrl: null, interests: null }), null);
});

test('job limits accept normal postings and reject oversized titles, descriptions and fields', () => {
  assert.equal(jobInputLimitError({ title: 'Band Office Administrator (Cree language an asset)', description: 'Duties include…'.repeat(200), location: 'Regina, SK' }), null);
  assert.equal(jobInputLimitError({ title: 'x'.repeat(JOB_TITLE_MAX) }), null);
  assert.equal(jobInputLimitError({ title: 'x'.repeat(JOB_TITLE_MAX + 1) }), 'title');
  assert.equal(jobInputLimitError({ title: 'Role', description: 'x'.repeat(JOB_DESCRIPTION_MAX + 1) }), 'description');
  assert.equal(jobInputLimitError({ title: 'Role', salary: 'x'.repeat(5001) }), 'salary');
  assert.equal(jobInputLimitError({ title: 'Role', status: 'active', featured: true }), null);
});

test('job limits cover persisted list fields and the salary range object', () => {
  const normal = { title: 'Role', responsibilities: ['Answer phones', 'Book meetings'], qualifications: ['Grade 12'], benefits: ['Dental'], communityTags: ['Treaty 6'], badges: ['Remote'], salaryRange: { min: 50000, max: 60000, period: 'year', currency: 'CAD', display: '$50,000 - $60,000' } };
  assert.equal(jobInputLimitError(normal), null);
  assert.equal(jobInputLimitError({ title: 'Role', responsibilities: ['x'.repeat(5001)] }), 'responsibilities');
  assert.equal(jobInputLimitError({ title: 'Role', qualifications: Array(201).fill('x') }), 'qualifications');
  assert.equal(jobInputLimitError({ title: 'Role', benefits: Array(10).fill('x'.repeat(4000)) }), 'benefits');
  assert.equal(jobInputLimitError({ title: 'Role', badges: ['x'.repeat(250000)] }), 'badges');
  assert.equal(jobInputLimitError({ title: 'Role', communityTags: Array(1000).fill('t') }), 'communityTags');
  assert.equal(jobInputLimitError({ title: 'Role', salaryRange: { min: 1, notes: 'x'.repeat(250000) } }), 'salaryRange');
  assert.equal(jobInputLimitError({ title: 'Role', salaryRange: { min: 1, nested: { huge: 'x' } } }), 'salaryRange');
  assert.equal(jobInputLimitError({ title: 'Role', salaryRange: ['x'.repeat(250000)] }), 'salaryRange');
  assert.equal(jobInputLimitError({ title: 'Role', salaryRange: undefined }), null);
});
