import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('team page offers self-serve links without claiming an email send',()=>{const s=readFileSync('src/app/org/dashboard/team/page.tsx','utf8');assert.match(s,/<TeamInvitations/);assert.doesNotMatch(s,/To add a colleague,.*contact IOPPS support/);});
