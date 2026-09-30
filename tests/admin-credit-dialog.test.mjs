import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './helpers/security-fixtures.mjs';

function fixture() {
 let cells=[],cursor=0;const requests=[];
 const jsx=(type,props)=>({type,props});
 const page=sourceModule('src/app/admin/employers/page.tsx',{mocks:{
  react:{useState:initial=>{const i=cursor++;if(!(i in cells))cells[i]=initial;return [cells[i],value=>{cells[i]=typeof value==='function'?value(cells[i]):value;}];},useEffect:()=>{},useCallback:fn=>fn,useMemo:fn=>fn()},
  'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{},'next/navigation':{useSearchParams:()=>({get:()=>null})},
  'react-hot-toast':{success:()=>{},error:()=>{}},
  '@/components/auth/AuthProvider':{useAuth:()=>({user:{getIdToken:async()=> 'fictional-token'}})},
  '@/components/admin':{},'@/lib/format-date':{},'@/lib/utils':{cn:()=>''},
 },globals:{crypto,fetch:async(url,init)=>{if(url.endsWith('/credits')){requests.push(JSON.parse(init.body));return Response.json({balance:20});}return Response.json({employers:[]});}}}).default;
 const walk=node=>!node||typeof node!=='object'?[]:[node,...(Array.isArray(node)?node:Object.values(node.props||{})).flatMap(walk)];
 const render=()=>{cursor=0;return page();};
 render();
 const modalIndex=cells.findIndex(value=>value&&typeof value==='object'&&'requestId' in value);
 const open=(id,key)=>{cells[modalIndex]={open:true,employerId:id,employerName:id,balance:0,requestId:key};return walk(render()).find(node=>node.type?.name==='GrantCreditModal');};
 return {open,render,walk,requests,renderModal:node=>{const parent=cells;cells=[];cursor=0;const tree=node.type(node.props);cells=parent;return tree;}};
}

test('successful grant unmounts the dialog; another employer starts at one credit with a fresh retry ID',async()=>{
 const h=fixture(),first=h.open('fictional-a','fictional-request-a');
 assert.ok(first);await first.props.onConfirm(20);
 assert.equal(h.walk(h.render()).some(node=>node.type?.name==='GrantCreditModal'),false,'successful close unmounts local amount state');
 const second=h.open('fictional-b','fictional-request-b');assert.ok(second);
 assert.equal(h.requests[0].requestId,'fictional-request-a');
 const input=h.walk(h.renderModal(second)).find(node=>node.type==='input');assert.equal(input.props.value,'1');
 assert.notEqual(first.props.employerName,second.props.employerName);
 await second.props.onConfirm(1);assert.equal(h.requests[1].credits,1);assert.equal(h.requests[1].requestId,'fictional-request-b');
});
