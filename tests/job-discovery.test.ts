import test from "node:test";
import assert from "node:assert/strict";
import { employerLogo, jobSummary, matchesDiscoveryFilters, salaryInfo, type DiscoveryFilters } from "../src/lib/job-discovery.ts";
const empty: DiscoveryFilters = {employer:"",area:"",added:"",closing:"",disclosed:"",training:"",salaryPeriod:"year",salaryMin:"",salaryMax:""};
test("employer branding resolves identity first and unambiguous exact name second", () => {
 const brands=[{id:"stc",name:"Saskatoon Tribal Council",logoUrl:"/stc.png"},{id:"other",name:"Other",logoUrl:"/other.png"}];
 assert.equal(employerLogo({id:"job",title:"Worker",employerName:"Saskatoon Tribal Council"},brands),"/stc.png");
 assert.equal(employerLogo({id:"job",title:"Worker",employerId:"other",employerName:"Saskatoon Tribal Council"},brands),"/other.png");
 assert.equal(employerLogo({id:"job",title:"Worker",employerName:"Unknown"},brands),undefined);
 assert.equal(employerLogo({id:"job",title:"Worker",employerName:"Saskatoon Tribal Council"},[...brands,{id:"duplicate",name:"Saskatoon Tribal Council",logoUrl:"/duplicate.png"}]),undefined);
});
test("summary begins at the actual role summary and strips markup", () => {
 assert.equal(jobSummary({id:"j",title:"Worker",description:"&amp;quot; &quot;"}), '&quot; "');
 assert.equal(jobSummary({id:"j",title:"Worker",description:"Worker\nLine Authority: Supervisor\nPosition Summary:\n<p>Care for children &amp; youth.</p>"}),"Care for children & youth.");
});
test("hourly pay is never multiplied by a thousand or compared with annual pay", () => {
 const job={id:"j",title:"Worker",salary:"$23.00–$27.75 per hour"};
 assert.deepEqual(salaryInfo(job),{min:23,max:27.75,period:"hour",display:job.salary});
 assert.equal(matchesDiscoveryFilters(job,{...empty,salaryPeriod:"hour",salaryMin:"25"}),true);
 assert.equal(matchesDiscoveryFilters(job,{...empty,salaryPeriod:"year",salaryMin:"25000"}),false);
 assert.equal(matchesDiscoveryFilters({...job,salary:"$50k–$65k annually"},{...empty,salaryMin:"60000"}),true);
 assert.equal(matchesDiscoveryFilters({...job,salary:"Competitive"},{...empty,disclosed:"1"}),false);
});
test("a clearly labelled hourly hiring range is discoverable without inventing annual pay", () => {
 const job = { id: "j", title: "Insurance Advisor", description: "Expected Compensation: The expected hourly hiring range for this role is $23.00 to $27.75 based on a 21-hour work week." };
 const salary = salaryInfo(job);
 assert.ok(salary, "an explicit compensation range should be normalized");
 assert.equal(salary.min, 23);
 assert.equal(salary.max, 27.75);
 assert.equal(salary.period, "hour");
 assert.equal(matchesDiscoveryFilters(job, {...empty, salaryPeriod: "hour", salaryMin: "25"}), true);
});

test("compensation enrichment never overrides undisclosed pay or guesses from unrelated amounts", () => {
 const description = "Expected Compensation: The expected hourly hiring range is $23.00 to $27.75 based on a 21-hour work week.";
 assert.equal(salaryInfo({ id: "j", title: "Worker", salaryRange: { disclosed: false }, description }), null);
 assert.equal(salaryInfo({ id: "j", title: "Worker", description: "Benefits include a $500 to $1000 training allowance. A 21-hour work week is available." }), null);
 assert.equal(salaryInfo({ id: "j", title: "Worker", description: "Expected Compensation: The expected hiring range is $43,000 to $53,000 based on a 37.5-hour work week." }), null);
 assert.equal(salaryInfo({ id: "j", title: "Worker", salary: "$40 / hour", description })?.min, 40);
});

test("combined discovery filters use explicit job data and reset cleanly", () => {
 const now=Date.parse("2026-09-08T12:00:00Z");
 const job={id:"j",title:"Worker",employerName:"STC",department:"Client Services",createdAt:"2026-09-07T12:00:00Z",closingDate:"2026-09-10T12:00:00Z",willTrain:true};
 assert.equal(matchesDiscoveryFilters(job,{...empty,employer:"STC",area:"Client Services",added:"7",closing:"1",training:"1"},now),true);
 assert.equal(matchesDiscoveryFilters({...job,willTrain:false},{...empty,training:"1"},now),false);
 assert.equal(matchesDiscoveryFilters({...job,closingDate:"2026-09-01"},{...empty,closing:"1"},now),false);
 assert.equal(matchesDiscoveryFilters(job,{...empty,employer:"Another employer"},now),false);
 assert.equal(matchesDiscoveryFilters(job,empty,now),true);
});
