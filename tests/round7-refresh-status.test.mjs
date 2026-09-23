import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './helpers/security-fixtures.mjs';
function nodes(node){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
function text(node){if(node===null||node===undefined||typeof node==='boolean')return '';if(typeof node!=='object')return String(node);return [node.props?.children].flat(Infinity).map(text).join('');}
test('refresh status exposes pending, success and failure without changing listing state',async()=>{
 const state=[];let index=0,release,reject;const refresh=()=>new Promise((a,b)=>{release=a;reject=b;});
 const {default:Status}=sourceModule('src/components/business-review/BusinessListingStatus.tsx',{globals:{Error},mocks:{react:{useState(initial){const i=index++;if(!(i in state))state[i]=initial;return [state[i],v=>state[i]=typeof v==='function'?v(state[i]):v];}},'@/lib/business-listing-review':{getBusinessListingReview:o=>o.directoryReview,businessListingIssues:()=>[],REVIEW_LABELS:{pending:'In review'}},'@/lib/organization-profile':{isOrganizationPubliclyVisible:()=>false}}});
 const props={org:{directoryReview:{status:'pending',revision:1}},onSubmit:async()=>{},onEdit(){},onRefresh:refresh};const render=()=>{index=0;return Status(props);};
 const button=()=>nodes(render()).find(n=>n.type==='button'&&/Refresh/.test(text(n)));
 const first=button().props.onClick();assert.match(text(render()),/Refreshing/);assert.equal(button().props.disabled,true);release();await first;assert.match(text(render()),/Status refreshed/);assert.equal(button().props.disabled,false);
 const second=button().props.onClick();reject(new Error('Fictional unavailable'));await second;assert.match(text(render()),/Fictional unavailable/);assert.doesNotMatch(text(render()),/Status refreshed/);assert.equal(props.org.directoryReview.status,'pending');
});
