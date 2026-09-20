import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const file='src/app/jobs/employerFilters.ts';
function load(){
  assert.ok(fs.existsSync(file),'jobs require a canonical employer data projection');
  const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});return exports;
}
const job=(id,name,employerId=id,extra={})=>({id,title:'Worker',employerName:name,employerId,...extra});
test('canonical names normalize Unicode apostrophes, composition, case and whitespace, not unrelated names',()=>{
  const {canonicalEmployerName}=load();
  assert.equal(canonicalEmployerName('  St. Mary’s\u00a0 Health  Centre '),canonicalEmployerName("st. mary's Health Centre"));
  assert.equal(canonicalEmployerName('Me\u0301tis Centre'),canonicalEmployerName('Métis Centre'));
  for(const name of ['Marys Health Centre','St Mary Health Centre','St. Mary’s Health Society','Métis Center']) assert.notEqual(canonicalEmployerName(name),canonicalEmployerName('St. Mary’s Health Centre'));
});
test('explicit full-name aliases project once and retain every underlying ID and combined job count',()=>{
  const {projectEmployerFilters,matchesEmployerFilter}=load();
  const jobs=[job('a','FNHA','fnha-a'),job('b','First Nations Health Authority','fnha-b'),job('c','First Nations Health Authority (FNHA)','fnha-c'),job('d','Saskatchewan First Nation Family and Community Institute','sfn-a'),job('e','Saskatchewan First Nations Family and Community Institute Inc.','sfn-b'),job('f','Saskatchewan First Nations Family and Community Services','different'),job('g','First Nations Health Council','council')];
  const before=JSON.stringify(jobs),options=projectEmployerFilters(jobs);
  assert.equal(options.length,4);
  const fnha=options.find(o=>o.label==='First Nations Health Authority');assert.ok(fnha);
  assert.deepEqual(Array.from(fnha.employerIds).sort(),['fnha-a','fnha-b','fnha-c']);
  assert.equal(jobs.filter(j=>matchesEmployerFilter(j,fnha.value,options)).length,3);
  assert.equal(jobs.filter(j=>matchesEmployerFilter(j,'FNHA',options)).length,3,'legacy URL alias is accepted');
  const family=options.find(o=>o.label==='Saskatchewan First Nations Family and Community Institute');assert.ok(family);
  assert.equal(jobs.filter(j=>matchesEmployerFilter(j,family.value,options)).length,2);
  assert.equal(matchesEmployerFilter(job('other','Old feed label','fnha-b'),fnha.value,options),true,'associated employer IDs survive name differences');
  assert.equal(matchesEmployerFilter(job('other','Other',undefined,{orgId:'fnha-c',employerId:undefined}),fnha.value,options),true);
  assert.equal(JSON.stringify(jobs),before,'projection never changes source records');
});
test('no generic acronym, punctuation, suffix or similar-name merging',()=>{
  const {projectEmployerFilters,matchesEmployerFilter}=load();
  const jobs=['ABC','Alpha Beta Council','Alpha Beta Council North','Alpha Beta Council Inc.','Alpha & Beta Council','Alpha and Beta Council','Saskatchewan First Nation Family Services','Saskatchewan First Nations Family Services'].map((name,i)=>job(String(i),name));
  const options=projectEmployerFilters(jobs);assert.equal(options.length,jobs.length);
  for(const option of options) assert.equal(jobs.filter(j=>matchesEmployerFilter(j,option.value,options)).length,1);
});
