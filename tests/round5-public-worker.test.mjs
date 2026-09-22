import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as React from 'react';
const require = createRequire(import.meta.url);
// Execute real TSX with inert hooks and explicit local fixtures; no SDK or network.
function load(file, names = [], overrides = {}, globals = {}) {
  const source = fs.readFileSync(file, 'utf8') + names.map(n => `\nexports.${n} = ${n};`).join('');
  const fixtureModule = { exports: {} };
  const stub = () => null;
  const hooks = { ...React, useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect: () => {}, useMemo: fn => fn(), useCallback: fn => fn, useRef: value => ({ current: value }), useId: () => 'fixture-description' };
  const localRequire = id => {
    if (id in overrides) return overrides[id];
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return require(id);
    if (id === 'next/link') return { default: 'a' };
    if (id === 'next/image') return { default: 'img' };
    if (id === 'next/navigation') return { useRouter: () => ({}), useSearchParams: () => new URLSearchParams(), usePathname: () => '/', useParams: () => ({slug:'fixture'}) };
    if (id === '@/lib/auth-context') return { useAuth: () => ({ user: null, loading: false }) };
    if (id === '@/lib/toast-context') return { useToast: () => ({}) };
    if (id.startsWith('@/components/')) return { default: stub };
    if (id.startsWith('@/lib/') && !id.includes('firestore') && !id.includes('firebase')) {
      const base = 'src/' + id.slice(2);
      const target = ['.ts', '.tsx'].map(ext => base + ext).find(fs.existsSync);
      if (target) return load(target, [], overrides, globals);
    }
    if (id.startsWith('@/')) return {};
    if (id.startsWith('.')) {
      const base = path.resolve(path.dirname(file), id);
      const target = ['', '.ts', '.tsx'].map(ext => base + ext).find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      return load(target, [], overrides, globals);
    }
    return require(id);
  };
  const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','module','exports', ...Object.keys(globals), js)(localRequire,fixtureModule,fixtureModule.exports,...Object.values(globals));
  return fixtureModule.exports;
}
function nodes(tree) {
  if (tree == null || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree !== 'object') return [tree];
  if (typeof tree.type === 'function') return nodes(tree.type(tree.props));
  return [tree, ...nodes(tree.props?.children)];
}
const text = tree => nodes(tree).filter(n => typeof n === 'string' || typeof n === 'number').join('');
test('#5 long descriptions expose word-safe preview and the complete stored text', () => {
  const description = 'Complete words and details. '.repeat(60) + 'FINAL SOURCE SENTENCE';
  const tree = nodes(load('src/components/jobs/JobDescription.tsx').default({description}));
  const details = tree.find(n => n.type === 'details');
  assert.ok(details, 'long descriptions need an actual expandable control');
  assert.ok(text(details).includes(description));
  const summary = tree.find(n => n.type === 'summary');
  assert.ok(summary);
  const preview = tree.find(n => n.props?.['data-description-preview']);
  assert.ok(preview);
  const snippet = text(preview).replace(/…$/, '');
  assert.ok(description.startsWith(snippet));
  assert.ok(/\s/.test(description[snippet.length]), 'preview ends at a word boundary');
});
test('#5 short or absent source descriptions never invent content or source links', () => {
  const Component = load('src/components/jobs/JobDescription.tsx').default;
  for (const description of ['', 'Only the stored excerpt.']) {
    const tree = nodes(Component({description}));
    assert.equal(tree.some(n => n.type === 'details'), false);
    assert.equal(tree.some(n => n.type === 'a'), false);
    assert.ok(text(tree).includes(description));
  }
});
for (const [file,name] of [['login','LoginForm'],['forgot-password','default']]) test(`#15 ${file} first heading is h1`, () => {
  const component = load(`src/app/${file}/page.tsx`, name === 'default' ? [] : [name])[name];
  const headings = nodes(component()).filter(n => typeof n.type === 'string' && /^h[1-6]$/.test(n.type));
  assert.equal(headings[0]?.type, 'h1');
});
test('#13 footer copyright is spaced and includes rights statement', () => {
  const tree = load('src/components/Footer.tsx').default();
  assert.ok(text(tree).includes(`IOPPS © ${new Date().getFullYear()}. All rights reserved.`), text(tree));
});
test('#14 header logo does not repeat the adjacent IOPPS name', () => {
  const nav = load('src/components/NavBar.tsx', [], {'@/lib/theme-context':{useTheme:()=>({theme:'light'})}}).default;
  const tree = nodes(nav());
  const logo = tree.find(n => n.type === 'img' && n.props.src === '/logo.png');
  assert.equal(logo?.props.alt, '');
});
test('#17 actual feed scholarship adapter excludes expired dates and preserves rolling/unknown', async () => {
  const fixtures = [{id:'expired',status:'active',deadline:'2000-01-01'}, {id:'future',deadline:'2099-01-01'}, {id:'rolling',deadlineType:'rolling'}, {id:'unknown'}, {id:'closed',status:'closed'}, {id:'expires',expiresAt:'2000-01-01'}];
  const {fetchScholarships} = load('src/app/feed/page.tsx',['fetchScholarships'],{}, {fetch:async()=>({ok:true,json:async()=>({scholarships:fixtures})})});
  assert.deepEqual((await fetchScholarships()).map(x=>x.id), ['future','rolling','unknown']);
});
test('#7 related API and list collapse proven duplicates while preserving locations and intakes', async () => {
  const base = {id:'a', title:'Advisor',employerName:'Example',location:'Regina',description:'Full source description',closingDate:'2099-01-01'};
  const jobs = [base,{...base,id:'b'},{...base,id:'c',location:'Saskatoon'},{...base,id:'d',closingDate:'2099-02-01'}];
  const {RelatedJobList} = load('src/app/jobs/[slug]/JobDetailClient.tsx',['RelatedJobList']);
  const query={limit(){return this;},get:async()=>({docs:jobs.map(job=>({id:job.id,data:()=>job}))})};
  const {GET}=load('src/app/api/jobs/[id]/related/route.ts',[],{
    'next/server':{NextResponse:{json:Response.json}},
    '@/lib/firebase-admin':{getAdminDb:()=>({collection:()=>({where:()=>query,doc:id=>({get:async()=>({id,exists:true,data:()=>({employerId:'org'})})})})})},
    '@/lib/server/public-job-routing':{findPublicJobDocument:async()=>({source:'jobs',id:'current'})},
    '@/lib/server/job-slugs':{buildJobRouteSlug:job=>job.id},
    '@/lib/server/public-detail-cache':{withPublicDetailCache:response=>response},
  });
  const result=await (await GET(new Request('https://fixture.invalid'),{params:Promise.resolve({id:'current'})})).json();
  const links = nodes(RelatedJobList({title:'More from Example',jobs:result.employerJobs})).filter(n=>n.type==='a');
  assert.equal(links.length,3);
});


test('#6 profile photo Edit invokes the actual referenced image chooser', () => {
  let cursor=0, clicked=0;
  const ref={current:{click:()=>clicked++}};
  const {ProfileContent}=load('src/app/profile/page.tsx',['ProfileContent'],{
    react:{...React,useEffect:()=>{},useCallback:fn=>fn,useRef:()=>ref,useState:value=>[cursor++===1?false:value,()=>{}]},
    '@/lib/auth-context':{useAuth:()=>({user:{uid:'fictional',displayName:'Test Member'}})},
  });
  const tree=nodes(ProfileContent());
  const button=tree.find(n=>n.type==='button' && n.props['aria-label']==='Edit profile photo');
  const input=tree.find(n=>n.type==='input' && n.props.type==='file');
  assert.equal(input.props.ref,ref);
  assert.equal(input.props.accept,'image/*');
  button.props.onClick();
  assert.equal(clicked,1);
});
for (const kind of ['events','scholarships']) test(`#11 #12 ${kind} count, posting copy and full accessible card names`,()=>{
  let cursor=0;
  const title='A complete opportunity title that must remain accessible at every display width';
  const item={id:'fixture',title,description:'Stored complete description',deadline:'2099-01-01',startDate:'2099-01-01',category:'Scholarship'};
  const directory=load('src/components/opportunities/OpportunityDirectory.tsx',[],{
    react:{...React,useEffect:()=>{},useMemo:fn=>fn(),useState:value=>[cursor++===1?{kind,attempt:0,items:[item],error:''}:value,()=>{}]},
    '@/components/AppShell':{default:({children})=>children},
    '@/components/DirectoryPagination':{default:()=>null,useDirectoryFilter:(_key,value)=>[value,()=>{}],useDirectoryFilterActions:()=>()=>{},useDirectoryPagination:items=>({page:1,pageItems:items,totalPages:1,setPage:()=>{}})},
  }).default;
  const tree=nodes(directory({kind}));
  assert.ok(text(tree).includes('1 opportunity'));
  assert.ok(text(tree).includes(`to post ${kind==='events'?'events':'scholarships and grants'}.`));
  const links=tree.filter(n=>n.type==='a' && n.props.href===`/${kind}/fixture`);
  assert.equal(links.length,2);
  for(const link of links) assert.ok(text(link).includes(title));
});
test('#8 taxonomy matches explicit canonical categories and employment labels only',()=>{
  const {jobArea,matchesEmploymentType}=load('src/lib/job-discovery.ts');
  assert.equal(jobArea({category:'Health & Wellness'}),'Health & Wellness');
  assert.equal(jobArea({category:'Nursing department'}),'');
  assert.equal(jobArea({department:'Education'}),'');
  assert.equal(matchesEmploymentType({employmentType:'Permanent Full Time'},'Full-time'),true);
  assert.equal(matchesEmploymentType({employmentType:'Student'},'Internship'),false);
  assert.equal(matchesEmploymentType({employmentType:'Term'},'Contract'),false);
});
test('#4 rendered job date metadata separates label and value after the colon',()=>{
  let cursor=0;
  const job={id:'fixture',title:'Advisor',employerName:'Example',closingDate:'2099-01-01',createdAt:'2026-01-01',source:'feed'};
  const {JobDetailContent}=load('src/app/jobs/[slug]/JobDetailClient.tsx',['JobDetailContent'],{
    react:{...React,useEffect:()=>{},useState:value=>[cursor++===0?job:cursor===2?false:value,()=>{}]},
    '@/hooks/useJobSave':{useJobSave:()=>({})},
  });
  const tree=nodes(JobDetailContent());
  const closing=tree.find(n=>n.type==='span' && text(n).includes('Closes:'));
  assert.ok(text(closing).includes('Closes: '));
});


test('#5 scholarship provider preview never cuts a word',()=>{
  let cursor=0;
  const description='Community learning opportunities '.repeat(8);
  const states=[{id:'fixture',title:'Scholarship',description:'Stored details'}, {id:'org',name:'Example',description}, [], null, '', '', 0, false];
  const {ScholarshipDetailContent}=load('src/app/scholarships/[slug]/ScholarshipDetailClient.tsx',['ScholarshipDetailContent'],{
    react:{...React,useEffect:()=>{},useState:value=>[cursor<states.length?states[cursor++]:value,()=>{}]},
    '@/components/Card':{default:({children})=>children},
  });
  const paragraphs=nodes(ScholarshipDetailContent()).filter(n=>n.type==='p').map(text);
  const snippet=paragraphs.find(s=>s.startsWith('Community learning') && s!==description);
  assert.ok(snippet, 'provider preview is rendered');
  const prefix=snippet.replace(/(?:…|\.\.\.)$/,'');
  assert.ok(description.startsWith(prefix));
  assert.ok(/\s/.test(description[prefix.length]), 'provider preview ends on a word boundary');
});


test('#5 discovery summary preserves even a single long word',()=>{
 const {jobSummary}=load('src/lib/job-discovery.ts');
 const description='A'.repeat(260);
 assert.equal(jobSummary({id:'fixture',title:'Role',description}),description);
});
