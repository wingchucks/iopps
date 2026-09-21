import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmployerJobDuplicate } from '../src/lib/employer-job-duplicate.ts';
test('duplicate copies editable job content but never ownership, grants, applicants or publication state',()=>{
 const copy=buildEmployerJobDuplicate({id:'old',slug:'old',title:'Coordinator',description:'Community role',location:'Saskatoon',status:'active',active:true,featured:true,employerId:'foreign',orgId:'foreign',applications:3,featuredCreditConsumed:true,closingDate:'2000-01-01',requiresResume:true,hiringDetails:{schedule:'Weekdays'}});
 assert.equal(copy.title,'Coordinator (copy)');assert.equal(copy.description,'Community role');assert.equal(copy.status,'draft');assert.equal(copy.featured,false);assert.equal(copy.closingDate,'');assert.equal(copy.requiresResume,true);
 for(const key of ['id','slug','employerId','orgId','applications','featuredCreditConsumed','active'])assert.equal(key in copy,false);
 assert.deepEqual(copy.hiringDetails,{schedule:'Weekdays'});
});
