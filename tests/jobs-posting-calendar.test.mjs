import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument, DomUtils } from 'htmlparser2';
import { sourceModule } from './helpers/security-fixtures.mjs';

function renderedText(markup) {
  // Extract assertion text from an inert DOM; never sanitize or re-render it as HTML.
  return DomUtils.textContent(parseDocument(markup));
}

for (const [name, markup, expected] of [
  ['multiline comments', 'Originally posted: <!-- hidden\ncomment -->2026-09-19', 'Originally posted: 2026-09-19'],
  ['nested comment opener', 'Originally posted: <!--<!-- hidden -->2026-09-19', 'Originally posted: 2026-09-19'],
  ['comment opener reconstructed by stripping', '<!<!-- hidden -->--', '--'],
  ['escaped security strings', '<p>&lt;!-- &lt;script&gt;alert(1)&lt;/script&gt; &amp; text</p>', '<!-- <script>alert(1)</script> & text'],
]) {
  test(`SSR text assertions parse ${name} without sanitizing HTML`, () => {
    assert.equal(renderedText(markup), expected);
  });
}

function renderDetail(record) {
  let state=0;
  const shell=({children})=>React.createElement('div',null,children);
  const page=sourceModule('src/app/jobs/[slug]/JobDetailClient.tsx',{globals:{Date},mocks:{
    react:{...React,useEffect(){},useState(initial){const i=state++;return [i===0?{id:'fixture',title:'Fixture role',...record}:i===1?false:initial,()=>{}];}},
    'next/navigation':{useParams:()=>({slug:'fixture'}),useRouter:()=>({}),usePathname:()=>'/jobs/fixture',useSearchParams:()=>new URLSearchParams()},
    'next/link':{__esModule:true,default:({children,href})=>React.createElement('a',{href},children)},
    ...Object.fromEntries(['employer/HiringDetailsSummary','AppShell','EmployerLogo','Badge','Button','Card','ShareButton'].map(name=>[`@/components/${name}`,{__esModule:true,default:shell}])),
    '@/components/jobs/JobDescription':sourceModule('src/components/jobs/JobDescription.tsx'),
    '@/lib/auth-context':{useAuth:()=>({user:null})},
    '@/lib/firestore/savedItems':{},'@/lib/firestore/applications':{},'@/lib/job-funnel-analytics':{},
  }});
  return renderedText(renderToStaticMarkup(React.createElement(page.default)));
}

async function jsonLd(record) {
  const job={id:'fixture',active:true,status:'active',title:'Fixture role',...record};
  const metadata=sourceModule('src/lib/server/detail-metadata.ts',{globals:{Date},mocks:{
    '@/lib/server/public-opportunities':{},
    '@/lib/server/public-job-routing':{findPublicJobDocument:async()=>({source:'jobs',id:'fixture'})},
    '@/lib/server/public-organization-resolver':{},
    '@/lib/firebase-admin':{getAdminDb:()=>({collection:()=>({doc:()=>({get:async()=>({exists:true,id:'fixture',data:()=>job})})})})},
  }});
  return metadata.generateJobJsonLd('fixture');
}

test('actual structured data shares calendar provenance and original-posting precedence with detail',async()=>{
  const record={sourcePostingDate:'2026-09-19',publishedAt:'2026-09-19T00:00:00.000Z',postedAt:'2026-09-20T08:00:00.000Z',datePosted:'2026-09-21'};
  assert.equal((await jsonLd(record)).datePosted,'2026-09-19');
  delete record.sourcePostingDate;
  assert.equal((await jsonLd(record)).datePosted,'2026-09-19T00:00:00.000Z','real midnight remains an instant');
  assert.equal((await jsonLd({publishedAt:'2026-09-19'})).datePosted,'2026-09-19');
  assert.match(renderDetail({datePosted:'2026-09-19'}),/Originally posted: 2026-09-19/);
});

test('feed ingestion never supplies datePosted while direct creation keeps its posting semantics',async()=>{
  const createdAt='2026-09-21T08:30:00.000Z';
  for(const creation of [createdAt,{toDate:()=>new Date(createdAt)}]) {
    assert.equal((await jsonLd({source:'feed',createdAt:creation})).datePosted,undefined);
    assert.equal((await jsonLd({source:'feed',createdAt:creation,publishedAt:'invalid',sourcePostingDate:'2026-02-30'})).datePosted,undefined);
    assert.equal((await jsonLd({createdAt:creation})).datePosted,createdAt);
    assert.equal((await jsonLd({source:'direct',createdAt:creation})).datePosted,createdAt);
    for(const field of ['publishedAt','postedAt','datePosted']) {
      assert.equal((await jsonLd({source:'feed',createdAt:creation,[field]:'2026-09-19T02:30:00-06:00'})).datePosted,'2026-09-19T08:30:00.000Z');
      assert.equal((await jsonLd({source:'direct',createdAt:creation,[field]:'2026-09-19T02:30:00-06:00'})).datePosted,'2026-09-19T08:30:00.000Z');
    }
    assert.equal((await jsonLd({source:'feed',createdAt:creation,sourcePostingDate:'2026-09-19'})).datePosted,'2026-09-19');
  }
});

test('calendar provenance validates real calendar days and never relabels malformed values as dates',async()=>{
  const {jobDetailDates,jobPostingDate}=sourceModule('src/lib/job-detail-dates.ts',{globals:{Date}});
  for(const invalid of ['2026-02-30','2026-13-01','2026-00-01','2026-2-03','2026-09-19T00:00:00Z','nonsense',123,{}]) {
    const record={sourcePostingDate:invalid,publishedAt:'2026-09-19T00:00:00.000Z'};
    assert.equal(jobPostingDate(record),'2026-09-19T00:00:00.000Z',String(invalid));
    assert.equal(jobDetailDates(record)[0].date,'2026-09-18');
    assert.equal((await jsonLd(record)).datePosted,'2026-09-19T00:00:00.000Z');
  }
  for(const invalid of ['2026-02-30','2026-13-01','invalid']) {
    assert.equal(jobDetailDates({publishedAt:invalid}).length,0);
    assert.equal((await jsonLd({publishedAt:invalid})).datePosted,undefined);
  }
  assert.equal(jobDetailDates({publishedAt:'2028-02-29'})[0].date,'2028-02-29');
  assert.equal(jobDetailDates({publishedAt:new Date('2026-09-19T00:00:00Z')})[0].date,'2026-09-18');
  const seconds=Date.parse('2026-09-19T08:30:00Z')/1000;
  for(const value of [{seconds},{toDate:()=>new Date(seconds*1000)},'2026-09-19T02:30:00-06:00']) {
    assert.equal(jobDetailDates({publishedAt:value})[0].date,'2026-09-19');
  }
  assert.equal(jobDetailDates({updatedAt:'2026-09-21'}).length,0);
});

test('actual detail prefers proven calendar posting date without changing true timestamp dates',()=>{
  const record={sourcePostingDate:'2026-09-19',publishedAt:'2026-09-19T00:00:00.000Z',createdAt:'2026-09-20T00:00:00.000Z',sourceVerifiedAt:'2026-09-21T08:00:00.000Z'};
  for(const tz of ['America/Regina','America/Los_Angeles','Pacific/Auckland']) {
    const old=process.env.TZ;
    try {
      process.env.TZ=tz;
      const html=renderDetail(record);
      assert.match(html,/Originally posted: 2026-09-19/);
      assert.match(html,/Added to IOPPS: 2026-09-19/,'addition remains a real instant in existing policy timezone');
      assert.match(html,/Last source check: 2026-09-21/);
    } finally {if(old===undefined) delete process.env.TZ;else process.env.TZ=old;}
  }
  assert.match(renderDetail({publishedAt:record.publishedAt}),/Originally posted: 2026-09-18/,'midnight alone is not calendar provenance');
});
