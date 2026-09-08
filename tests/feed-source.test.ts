import { test } from 'node:test';
import assert from 'node:assert/strict';
import {loadFeedItems, feedJobKey, parseSimpleXml} from '../src/lib/server/feed-source.ts';
const board='https://jobs.dayforcehcm.com/en-US/westlandcorp/CANDIDATEPORTAL';
const site={clientNamespace:'westlandcorp',jobBoardCode:'candidateportal',cultureCode:'en-US'};
const html='<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{dehydratedState:{queries:[{queryKey:['site-info'],state:{data:site}}]}}}})+'</script>';
const job=(id:number)=>({jobPostingId:id,jobTitle:'Advisor',jobDescription:'Full job description',clientNamespace:'westlandcorp'});
function mock(pages:unknown[]){let i=0;return (async (_url,init)=>{
 if(i++===0)return new Response(html,{headers:{'Set-Cookie':'csrf=old; Path=/'}});
 if(i===2)return Response.json({csrfToken:'token'},{headers:{'Set-Cookie':'csrf=new; Path=/'}});
 assert.equal(new Headers(init?.headers).get('Cookie'),'csrf=new');
 assert.equal(new Headers(init?.headers).get('X-CSRF-TOKEN'),'token');
 const body=JSON.parse(String(init?.body)); assert.equal(body.cultureCode,'en-US');
 assert.equal(body.paginationStart,i-3);
 return Response.json(pages[i-3]);
 }) as typeof fetch;}
test('Dayforce follows CSRF contract and reads all pages',async()=>{
 const items=await loadFeedItems(board,'dayforce',mock([{jobPostings:[job(1)],offset:0,maxCount:2},{jobPostings:[job(2)],offset:1,maxCount:2}]));
 assert.equal(items.length,2);assert.equal(items[1].guid,'2');
});
test('Dayforce rejects incomplete pages',async()=>{await assert.rejects(loadFeedItems(board,'dayforce',mock([{jobPostings:[],offset:0,maxCount:2}])),/Incomplete/)});
test('Dayforce rejects repeated job identities',async()=>{await assert.rejects(loadFeedItems(board,'dayforce',mock([{jobPostings:[job(1)],offset:0,maxCount:2},{jobPostings:[job(1)],offset:1,maxCount:2}])),/repeated a job/)});
test('Dayforce accepts explicitly empty board',async()=>{assert.deepEqual(await loadFeedItems(board,'dayforce',mock([{jobPostings:[],offset:0,maxCount:0}])),[])});
test('Dayforce rejects HTML without board metadata',async()=>{await assert.rejects(loadFeedItems(board,'dayforce',async()=>new Response('<html>Unavailable</html>')),/metadata/)});
test('HTTP errors cannot become successful empty syncs',async()=>{await assert.rejects(loadFeedItems(board,'dayforce',async()=>new Response('',{status:403})),/HTTP 403/)});
test('Oracle paginates nested requisitions',async()=>{
 let n=0;const fetcher:typeof fetch=async(url)=>{const finder=new URL(String(url)).searchParams.get('finder');assert.match(finder!,new RegExp('offset='+n+',limit=25'));return Response.json({items:[{Offset:n,TotalJobsCount:2,SiteNumber:'CX_1001',requisitionList:[{Id:String(++n),Title:'Job'}]}]})};
 assert.equal((await loadFeedItems('https://oracle.example/jobs?finder=findReqs;siteNumber=CX_1001','oracle-hcm',fetcher)).length,2);
});
test('Oracle malformed source fails',async()=>{await assert.rejects(loadFeedItems('https://oracle.example/jobs?finder=findReqs;siteNumber=CX','oracle-hcm',async()=>Response.json({items:[]})),/Invalid/)});
test('legacy apply URLs match current details but separate boards and employers',()=>{
 assert.equal(feedJobKey(board+'/jobs/123/apply'),feedJobKey(board+'/jobs/123'));
 assert.notEqual(feedJobKey(board+'/jobs/123'),feedJobKey(board.replace('westlandcorp','another')+'/jobs/123'));
 assert.notEqual(feedJobKey(board+'/jobs/123'),feedJobKey(board.replace('CANDIDATEPORTAL','AGILE')+'/jobs/123'));
});
test('XML rejects webpage and unsupported Atom; preserves publication date',()=>{
 assert.throws(()=>parseSimpleXml('<html>OK</html>'));
 assert.throws(()=>parseSimpleXml('<feed><entry>job</entry></feed>'));
 assert.equal(parseSimpleXml('<rss><item><guid>1</guid><title>Job</title><pubDate>2026-09-01</pubDate></item></rss>')[0].pubDate,'2026-09-01');
});
test('unsupported feed and malformed ADP fail',async()=>{
 await assert.rejects(loadFeedItems(board,'unknown'),/Unsupported/);
 await assert.rejects(loadFeedItems(board,'adp',async()=>Response.json({})),/Unable to parse/);
});
test('Dayforce refuses metadata for a different board',async()=>{
 await assert.rejects(loadFeedItems(board.replace('CANDIDATEPORTAL','AGILE'),'dayforce',async()=>new Response(html)),/does not match/);
});
test('Dayforce refuses a changing total rather than silently truncating',async()=>{
 await assert.rejects(loadFeedItems(board,'dayforce',mock([{jobPostings:[job(1)],offset:0,maxCount:2},{jobPostings:[job(2)],offset:1,maxCount:3}])),/changed during pagination/);
});
