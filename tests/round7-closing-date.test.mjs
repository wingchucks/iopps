import {sourceModule} from './helpers/security-fixtures.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('closing-date validation accepts blank and leap days, rejects impossible and malformed dates',()=>{const {isValidClosingDate:valid}=sourceModule('src/lib/job-closing-date.ts',{globals:{Date}});for(const value of ['', '2028-02-29','2026-12-31'])assert.equal(valid(value),true,value);for(const value of ['2026-02-29','2026-04-31','2026-13-01','2026-01-00','23/09/2026','2026-9-23'])assert.equal(valid(value),false,value);});
test('create and edit job forms offer a labelled plain-text date fallback instead of native spinboxes',()=>{
 for(const f of ['src/app/org/dashboard/jobs/new/page.tsx','src/app/org/dashboard/jobs/[id]/edit/page.tsx']){const source=readFileSync(f,'utf8');assert.match(source,/<ClosingDateField/);assert.doesNotMatch(source,/type="date"/);assert.match(source,/isValidClosingDate/);}
});
