import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
test('assignment UI starts with explicit unselected role, disabled enable flag, and no browser Firestore mutation',()=>{
  const source = readFileSync('src/components/admin/OrganizationAdminAssignment.tsx','utf8');
  const exports: Record<string,React.ComponentType<{orgId:string;getToken:()=>Promise<string>;onApplied:()=>Promise<void>}>> = {};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>{if(name==='react')return React;if(name==='react/jsx-runtime')return jsx;throw Error(name);}});
  const html = renderToStaticMarkup(React.createElement(exports.default,{orgId:'batc',getToken:async()=>'',onApplied:async()=>{}}));
  assert.match(html,/Exact existing user email/);
  assert.match(html,/Organization administrator/);
  assert.match(html,/Enable this organization/);
  assert.doesNotMatch(html,/checked=""/);
  assert.match(source,/<dialog/);
  assert.match(source,/review\.confirmation/);
  assert.match(source,/verified !== true/);
  assert.doesNotMatch(source,/firebase\/firestore|setDoc|updateDoc/);
  const detail = readFileSync('src/app/admin/employers/[orgId]/page.tsx','utf8');
  assert.match(detail,/canAssignAdministrator/);
  assert.match(detail,/<OrganizationAdminAssignment/);
});

test('review renders the exact minimal visibility block on each mirror',()=>{
  const source=readFileSync('src/components/admin/OrganizationAdminAssignment.tsx','utf8');
  const review={email:'fixture@example.test',uid:'fixture',orgId:'batc',expiresAt:100000,current:{employerPublicVisibility:'public',organizationPublicVisibility:null},desired:{enable:true},changes:{employer:{publicVisibility:'hidden'},organization:{publicVisibility:'hidden'}},confirmation:'confirm'};
  let index=0;const states=['','',true,review,'',false,'',null];
  const exports: Record<string,React.ComponentType<{orgId:string;getToken:()=>Promise<string>;onApplied:()=>Promise<void>}>>={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>{if(name==='react')return {...React,useState:()=>[states[index++],()=>{}]};if(name==='react/jsx-runtime')return jsx;throw Error(name);}});
  const html=renderToStaticMarkup(React.createElement(exports.default,{orgId:'batc',getToken:async()=>'',onApplied:async()=>{}}));
  assert.match(html,/Employer public visibility<\/th><td[^>]*>public<\/td><td[^>]*>hidden/);
  assert.match(html,/Organization public visibility<\/th><td[^>]*>None<\/td><td[^>]*>hidden/);
});
