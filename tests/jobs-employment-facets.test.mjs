import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sourceModule } from './helpers/security-fixtures.mjs';

// Minimal verbatim metadata from the saved September 21 black-box records.
const jobs = [
  {id:'bee-clean-daytime-cleaner-haida-gwaii-2026', title:'Daytime Cleaner', employmentType:'Part-time, daytime; flexible coverage across three communities'},
  {id:'official-operations-clerk-1-year-contract-ontario-native-womens-association',title:'Operations Clerk (1 year Contract)',employmentType:'1-year contract'},
  {id:'0puDknZVwiYum2kNP7rU',title:'Home & Community Care Program Manager',jobType:'Full Time'},
];

function renderListing(records, type) {
  let state = 0;
  const shell = ({children}) => React.createElement('div', null, children);
  const page = sourceModule('src/app/jobs/page.tsx', {mocks:{
    react:{...React,useEffect(){},useState(initial){return [state++ === 0 ? records : state === 3 ? false : initial,()=>{}];}},
    'next/link':{__esModule:true,default:({children,href})=>React.createElement('a',{href},children)},
    '@/components/OpportunityHeader':{__esModule:true,default:shell},
    '@/components/EmployerLogo':{__esModule:true,default:shell},
    '@/components/Card':{__esModule:true,default:shell},
    '@/components/DirectoryPagination':{__esModule:true,default:()=>null,useDirectoryFilter:(key,fallback)=>[key==='type'?type:fallback,()=>{}],useDirectoryFilterActions:()=>()=>{},useDirectoryPagination:records=>({page:1,pageItems:records,totalPages:1,setPage(){}})},
    './useJobSearchDrafts':{useJobSearchDrafts:()=>({drafts:{q:'',location:''},edit(){},flush(){},reset(){}})},
    '@/lib/job-funnel-analytics':{trackJobFunnelEvent(){}},
  }});
  return renderToStaticMarkup(React.createElement(page.default));
}

test('actual jobs consumer includes audited compound Part-time record and counts only its match',()=>{
  const html=renderListing(jobs,'Part-time');
  assert.match(html,/1 job found/);
  assert.match(html,/Daytime Cleaner/);
  assert.doesNotMatch(html,/Home &amp; Community Care Program Manager/);
});
test('canonical employment equivalents and explicit compound types preserve unknowns and distinct types',()=>{
  const {matchesEmploymentType:matches}=sourceModule('src/lib/job-discovery.ts');
  for(const [label,types] of [
    ['Full Time',['Full-time']],[' FULL_TIME ',['Full-time']],['Permanent full-time',['Full-time']],
    ['Full-Time Term',['Full-time']],['Full-time leadership role; see official posting',['Full-time']],
    ['1-year contract',['Contract']],['Full-time one-year contract',['Full-time','Contract']],
    ['Term Position (Contract)',['Contract']],['Temporary full-time, 1 year',['Temporary','Full-time']],
    ['Fixed term / on-call casual',['Casual']],['Casual Term',['Casual']],['Part time',['Part-time']],
    ['Internship',['Internship']],['2 permanent full-time; 1 term full-time',['Full-time']],
  ]) {
    for(const type of ['Full-time','Part-time','Contract','Temporary','Internship','Casual']) {
      assert.equal(matches({employmentType:label},type),types.includes(type),`${label}: ${type}`);
    }
  }
  for(const label of ['', 'See official posting','Summer student, 35 hours per week','Faculty appointment','Not full-time','Contractor','Not a contract','Full-time-equivalent','Manager role; contract negotiations']) {
    const job={employmentType:label};
    assert.equal(matches(job,'All'),true);
    for(const type of ['Full-time','Part-time','Contract','Temporary','Internship','Casual']) assert.equal(matches(job,type),false,`${label}: ${type}`);
  }
  assert.equal(matches({jobType:'Full Time'},'Full-time'),true);
  assert.equal(matches({employmentType:'Part-time',jobType:'Full Time'},'Full-time'),false,'explicit employmentType wins over legacy jobType');
  assert.equal(matches({employmentType:'Unclassified appointment'},'Unclassified appointment'),true,'exact unknown URL filter is retained');
  for(const [type,title] of [['Contract','Operations Clerk'],['Full-time','Home &amp; Community Care Program Manager']]) {
    const html=renderListing(jobs,type);
    assert.match(html,/1 job found/);
    assert.ok(html.includes(title));
  }
  assert.match(renderListing(jobs,'All'),/3 jobs found/);
  assert.match(renderListing(jobs,'Internship'),/0 jobs found/);
});
test('explicit delimited employment types match independently without mining qualifier prose',()=>{
  const {matchesEmploymentType:matches}=sourceModule('src/lib/job-discovery.ts');
  for(const label of ['Full-time, contract','Full-time; Contract','Full-time / contract','Full-time (Contract)']) {
    assert.equal(matches({employmentType:label},'Full-time'),true,label);
    assert.equal(matches({employmentType:label},'Contract'),true,label);
    assert.equal(matches({employmentType:label},'Temporary'),false,label);
  }
  assert.equal(matches({employmentType:'Full-time, contract negotiations required'},'Contract'),false);
  const records=[{id:'one',title:'Mixed schedule',employmentType:'Full-time / Part-time'},...jobs];
  const before=JSON.stringify(records);
  assert.match(renderListing(records,'Part-time'),/2 jobs found/);
  assert.equal(JSON.stringify(records),before,'filter projection preserves raw labels and record identity');
});
export { renderListing };
