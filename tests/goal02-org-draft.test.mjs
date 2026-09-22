// Exact save handler with fictional lexical state / transport, not browser coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const page=fs.readFileSync('src/app/org/onboarding/page.tsx','utf8');
const source=page.slice(page.indexOf('  const saveStepProgress = async () => {'),page.indexOf('  const handleNext = async () => {'));
async function payload(overrides={}){
 let saved;
 const states={logoFile:null,logoPreview:null,description:'Fictional story',foundedYear:'',communityAffiliation:'',industry:'',size:'',city:'',province:'',website:'',services:[],hiringStatus:'',partnershipInterests:[],phone:'',contactEmail:'fictional@example.invalid',address:'',facebook:'',linkedin:'',instagram:'',twitter:'',institutionType:'',studentBodySize:'',accreditation:'',campusCount:'',enrollmentStatus:'',...overrides};
 const context={...states,user:{getIdToken:async()=> 'fictional-token'},setSaving(){},saveOrganizationOnboardingProgress:async(data,token)=>{assert.equal(token,'fictional-token');saved=JSON.parse(JSON.stringify(data));}};
 vm.runInNewContext(ts.transpileModule(source+'\nglobalThis.run=saveStepProgress;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);
 await context.run();return saved;
}
for(const [field,empty,value] of [['communityAffiliation','','Saved affiliation'],['website','','https://fictional.example.invalid'],['services',[],['Training']]])test(`explicitly cleared ${field} is sent; populated value remains`,async()=>{
 assert.deepEqual((await payload())[field],empty);assert.deepEqual((await payload({[field]:value}))[field],value);
});
