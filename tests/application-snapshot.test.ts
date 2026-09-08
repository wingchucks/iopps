import test from "node:test";
import assert from "node:assert/strict";
import { buildApplicationProfileSnapshot, createResumeObjectName } from "../src/lib/application-snapshot.ts";

test("application profile snapshot excludes permissions and remains unchanged after profile edits", () => {
 const source = { displayName:"Preview Candidate", email:"candidate@example.test", skills:["Planning"], education:[{school:"Example",degree:"Diploma",field:"Business",year:2020}], orgId:"private-org", role:"admin" as const };
 const snapshot=buildApplicationProfileSnapshot(source,"2026-09-08T00:00:00Z");
 source.displayName="Changed"; source.skills.push("New skill"); source.education[0].school="Changed school";
 assert.equal(snapshot.displayName,"Preview Candidate"); assert.deepEqual(snapshot.skills,["Planning"]); assert.equal(snapshot.education?.[0].school,"Example");
 assert.equal("orgId" in snapshot,false); assert.equal("role" in snapshot,false);
});
test("same-named resume uploads get different safe storage object names",()=>{
 const first=createResumeObjectName("../resume final.pdf");const second=createResumeObjectName("../resume final.pdf");
 assert.notEqual(first,second);assert(!first.includes("/"));assert(first.endsWith("resume_final.pdf"));
});
