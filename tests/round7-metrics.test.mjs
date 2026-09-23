import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sourceModule} from './helpers/security-fixtures.mjs';
test('every metric renders a real count or an explicit unavailable value, never blank',()=>{
 const {EmployerMetrics}=sourceModule('src/components/employer/EmployerOverview.tsx',{mocks:{'next/link':()=>null}});
 for(const stats of [{},{totalPosts:undefined,activePosts:null,applications:NaN,profileViews:Infinity},{totalPosts:0,activePosts:0,applications:5,profileViews:1}]){
  const html=renderToStaticMarkup(React.createElement(EmployerMetrics,{available:true,stats}));
  const counts=[...html.matchAll(/<strong[^>]*>(.*?)<\/strong>/g)].map(x=>x[1]);assert.equal(counts.length,4);assert.ok(counts.every(x=>x==='—'||/^\d+$/.test(x)),JSON.stringify(counts));
 }
 const html=renderToStaticMarkup(React.createElement(EmployerMetrics,{available:true,stats:{totalPosts:0,activePosts:0,applications:0,profileViews:0}}));assert.equal((html.match(/<strong[^>]*>0<\/strong>/g)||[]).length,4);
});
