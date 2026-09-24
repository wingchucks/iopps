import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(failFirst = false, paginated = false) {
 const slots=[],effects=[],writes=[];let cursor=0,tree;
 const user={uid:'owner',getIdToken:async()=> 'fictional'};
 const jsx=(type,props)=>({type,props});
 const react={useState(value){const i=cursor++;slots[i]??={value};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;}];},useRef(value){const i=cursor++;return slots[i]??={current:value};},useMemo(fn){cursor++;return fn();},useEffect(fn,deps){const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i].deps[j])){slots[i]={deps};effects.push(fn);}}};
 const applications=[{id:'alpha',postId:'a',userId:'a',status:'submitted'},{id:'beta',postId:'b',userId:'b',status:'submitted'},{id:'withdrawn',postId:'b',userId:'w',status:'withdrawn'}];
 const imports={react,'react/jsx-runtime':{jsx,jsxs:jsx},'@/lib/auth-context':{useAuth:()=>({user})},'@/lib/employer-application-updates':{updateApplicationBatch:async(ids,fn)=>{const saved=[],failed=[];for(const id of ids){if(failFirst&&id==='beta')failed.push(id);else {await fn(id);saved.push(id);}}failFirst=false;return {saved,failed};}}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/org/dashboard/applications/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,console,fetch:async(_url,options)=>{if(options.method==='PUT'){writes.push(JSON.parse(options.body).appId);return {ok:true};}return {ok:true,json:async()=>({applications:paginated?(_url.includes('?cursor=')?[applications[1]]:[applications[0]]):applications,hasMore:paginated&&!_url.includes('?cursor='),nextCursor:paginated&&!_url.includes('?cursor=')?'alpha':null,jobs:{a:{title:'Alpha'},b:{title:'Beta'}}})};},require:id=>imports[id]||{default:id}});
 const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
 async function render(){cursor=0;tree=exports.default();for(const f of effects.splice(0))f();await new Promise(r=>setImmediate(r));cursor=0;tree=exports.default();}
 const find=label=>nodes(tree).find(n=>n.props?.['aria-label']===label);
 return {render,writes,loadMore:async()=>{const button=nodes(tree).find(n=>n.type==='button'&&n.props.children==='Load more applications');assert.ok(button,'pagination must be actionable');await button.props.onClick();await render();},filter:async value=>{find('Filter applications by posting').props.onChange({target:{value}});await render();},select:async name=>{find('Select application from '+name).props.onChange();await render();},apply:async()=>{const n=nodes(tree).find(n=>n.type==='button'&&n.props.children==='Apply');if(n)await n.props.onClick();await render();},text:()=>JSON.stringify(tree),selectAll:async()=>{nodes(tree).find(n=>n.type==='input'&&n.props.type==='checkbox'&&!n.props['aria-label']).props.onChange();await render();}};
}
test('actual applications component never bulk-mutates Alpha hidden by Beta filter',async()=>{const h=harness();await h.render();await h.filter('a');await h.select('a');await h.filter('b');await h.apply();assert.deepEqual(h.writes,[]);await h.select('b');await h.apply();assert.deepEqual(h.writes,['beta']);});
test('returning to a filter does not restore a discarded selection',async()=>{const h=harness();await h.render();await h.filter('a');await h.select('a');await h.filter('b');await h.filter('a');await h.apply();assert.deepEqual(h.writes,[]);});
test('partial bulk failure keeps only failed visible applications selected for retry',async()=>{const h=harness(true);await h.render();await h.selectAll();await h.apply();assert.deepEqual(h.writes,['alpha']);await h.apply();assert.deepEqual(h.writes,['alpha','beta']);});
test('later application pages remain reachable and merge rather than replace the first page',async()=>{const h=harness(false,true);await h.render();await h.loadMore();assert.match(h.text(),/Select application from a/);assert.match(h.text(),/Select application from b/);assert.doesNotMatch(h.text(),/Load more applications/);});
test('select-all names eligible visible rows only and excludes withdrawn',async()=>{const h=harness();await h.render();await h.filter('b');await h.selectAll();await h.apply();assert.deepEqual(h.writes,['beta']);assert.match(h.text(),/Select all \(",1,"\)/);});
