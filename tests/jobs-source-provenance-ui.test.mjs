import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { renderListing } from './jobs-employment-facets.test.mjs';

const imported = { id:'source-fixture', title:'Imported role', source:'feed', description:'Source excerpt, unchanged.', externalUrl:'https://employer.example/jobs/original', sourceMetadata:{salary:'not-imported',closingDate:'not-imported',employmentType:'not-imported'} };
function renderDetail(record) {
  let state=0;
  const shell=({children})=>React.createElement('div',null,children);
  const page=sourceModule('src/app/jobs/[slug]/JobDetailClient.tsx',{mocks:{
    react:{...React,useEffect(){},useState(initial){const i=state++;return [i===0?record:i===1?false:initial,()=>{}];}},
    'next/navigation':{useParams:()=>({slug:record.id}),useRouter:()=>({}),usePathname:()=>'/jobs/fixture',useSearchParams:()=>new URLSearchParams()},
    'next/link':{__esModule:true,default:({children,href})=>React.createElement('a',{href},children)},
    ...Object.fromEntries(['employer/HiringDetailsSummary','AppShell','EmployerLogo','Badge','Button','Card','ShareButton'].map(name=>[`@/components/${name}`,{__esModule:true,default:shell}])),
    '@/components/jobs/JobDescription':sourceModule('src/components/jobs/JobDescription.tsx'),
    '@/lib/auth-context':{useAuth:()=>({user:null})},
    '@/lib/firestore/savedItems':{},'@/lib/firestore/applications':{},'@/lib/job-funnel-analytics':{},
  }});
  return renderToStaticMarkup(React.createElement(page.default));
}

test('direct/manual/unknown origins retain existing labels even with supplied metadata',()=>{
  for (const source of ['direct','manual',undefined]) {
    const record={...imported,source};
    const list=renderListing([record],'All');
    assert.match(list,/Pay not listed/);
    assert.match(list,/See listing for closing details/);
    for (const html of [list,renderDetail(record)]) assert.doesNotMatch(html,/see original posting|Check original posting/);
  }
  for (const render of [record=>renderListing([record],'All'),renderDetail]) {
    assert.doesNotMatch(render({...imported,sourceMetadata:undefined}),/see original posting/);
    // Availability in raw aliases does not guarantee a displayable canonical value.
    assert.match(render({...imported,sourceMetadata:{salary:'available',closingDate:'available',employmentType:'available'}}),/see original posting/);
  }
});

test('alias-only public records give guidance in actual consumers without guessing pay or dates',()=>{
  const {publicContentRecord}=sourceModule('src/lib/server/public-content-record.ts');
  for (const salaryRange of ['$25 hourly',{display:'25 to 30, terms unspecified'},{min:25,max:30}]) {
    for (const closingAlias of [{deadline:'2099-10-03'},{applicationDeadline:'10/03/2099, 12:00 AM'}]) {
      const record=publicContentRecord({...imported,salaryRange,...closingAlias});
      for (const html of [renderListing([record],'All'),renderDetail(record)]) {
        assert.match(html,/Pay: see original posting/);
        assert.match(html,/Closing date: see original posting/);
        assert.match(html,/Check original posting/);
        assert.doesNotMatch(html,/CAD|USD|\$25|25 to 30|2099|12:00|Closes /);
      }
    }
  }
});

test('canonical imported text wins over conflicting aliases without borrowing currency or period',()=>{
  const {publicContentRecord}=sourceModule('src/lib/server/public-content-record.ts');
  for (const salary of ['25 to 30, terms unspecified',{display:'25 to 30, terms unspecified'}]) {
    const record=publicContentRecord({...imported,salary,salaryRange:{min:90000,max:100000,currency:'CAD',period:'year'},closingDate:'2098-11-04',deadline:'2099-10-03',applicationDeadline:'2097-01-01'});
    for (const html of [renderListing([record],'All'),renderDetail(record)]) {
      assert.match(html,/25 to 30, terms unspecified/);
      assert.match(html,/Closes/);
      assert.doesNotMatch(html,/see original posting|Check original posting|CAD|USD|90,000|100,000|\/ year|2099|2097/);
    }
  }
});

test('detail numeric imported pay without explicit text is not formatted with guessed units',()=>{
  const {publicContentRecord}=sourceModule('src/lib/server/public-content-record.ts');
  for (const salary of [25,{min:25,max:30},'',null]) {
    const record=publicContentRecord({...imported,salary});
    const html=renderDetail(record);
    assert.match(html,/Pay: see original posting/);
    assert.match(html,/Check original posting/);
    assert.doesNotMatch(html,/CAD|USD|\$25|\$30/);
  }
});

test('actual consumers preserve supplied values and never manufacture missing source facts',()=>{
  const record={...imported,salary:'$65,100 - $84,600',closingDate:'2027-10-03',employmentType:'Full time'};
  for (const html of [renderListing([record],'All'),renderDetail(record)]) {
    assert.ok(html.includes('$65,100 - $84,600'));
    assert.doesNotMatch(html,/see original posting|CAD|USD|per year/);
    assert.match(html,/Closes/);
  }
  for (const html of [renderListing([imported],'All'),renderDetail(imported)]) {
    assert.doesNotMatch(html,/65,100|84,600|Full time|2026-10-03/);
  }
});

test('source links reject unsafe URLs, fall back safely and keep labels without a source',()=>{
  const {jobImportLabels}=sourceModule('src/lib/job-import-labels.ts');
  for (const externalUrl of ['javascript:alert(1)','data:text/html,test','https://user:pass@employer.example','/relative','not a URL']) {
    const record={...imported,externalUrl,externalApplyUrl:'https://employer.example/apply'};
    assert.equal(jobImportLabels(record).sourceHref,record.externalApplyUrl);
    for (const html of [renderListing([record],'All'),renderDetail(record)]) {
      assert.match(html,/href="https:\/\/employer.example\/apply"[^>]*>Check original posting/);
    }
  }
  const record={...imported,externalUrl:undefined};
  for (const html of [renderListing([record],'All'),renderDetail(record)]) {
    // Without a safe source link, say the detail is not listed rather than pointing nowhere.
    assert.match(html,/Pay not listed/);
    assert.match(html,/Closing date not listed/);
    assert.doesNotMatch(html,/see original posting|Check original posting/);
  }
});

test('actual detail exposes missing import metadata while preserving full-source excerpt warning',()=>{
  const html=renderDetail(imported);
  assert.match(html,/Pay: see original posting/);
  assert.match(html,/Closing date: see original posting/);
  assert.match(html,/href="https:\/\/employer.example\/jobs\/original"[^>]*>Check original posting/);
  assert.match(html,/may be an excerpt/);
  assert.match(html,/Read full details at source/);
  assert.match(html,/Source excerpt, unchanged\./);
});

test('actual discovery card identifies missing imported pay and closing details with a source link',()=>{
  const html=renderListing([imported],'All');
  assert.match(html,/Pay: see original posting/);
  assert.match(html,/Closing date: see original posting/);
  assert.match(html,/href="https:\/\/employer.example\/jobs\/original"[^>]*>Check original posting/);
  assert.doesNotMatch(html,/Pay not listed|See listing for closing details/);
  assert.doesNotMatch(html,/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/,'source must not be a nested link');
});
