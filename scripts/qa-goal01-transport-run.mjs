// Diagnostic: complete existing Goal1 criteria against the verified build; no rebuild.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
assert.ok(fs.existsSync('.next/BUILD_ID'));
const out=process.env.MISSION_OUTPUT;assert.ok(out);
const env={...process.env,GOAL01_FICTIONAL_YOUTUBE:'true',USERPROFILE:'C:/Users/natha',LOCALAPPDATA:'C:/Users/natha/AppData/Local',APPDATA:'C:/Users/natha/AppData/Roaming',PROGRAMFILES:'C:/Program Files',TMPDIR:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TEMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch'};
const commands=[];
for(const mode of ['false','true']){
 const target=path.join(out,mode==='true'?'same-tab':'separate-tab');fs.mkdirSync(target,{recursive:true});
 const args=['--import',new URL('./test-typescript-loader.mjs',import.meta.url).href,'tests/e2e-goals/goal-01-auth.mjs'];
 const r=spawnSync(process.execPath,args,{env:{...env,MISSION_OUTPUT:target,GOAL01_SAME_TAB_PROBE:mode},encoding:'utf8',timeout:180000,maxBuffer:30*1024*1024});
 fs.writeFileSync(path.join(target,'execution.log'),((r.stdout||'')+(r.stderr||'')).replace(/([?&](?:oobCode|apiKey|token)=)[^\s&"']+/g,'$1[REDACTED]'));
 commands.push({mode,reusedBuild:true,status:r.status,error:r.error?.message});
 fs.writeFileSync(path.join(out,'transport-commands.json'),JSON.stringify(commands,null,2));
 console.log(JSON.stringify({output:target,reusedBuild:true,status:r.status}));
 if(r.status!==0){process.exitCode=1;break;}
}
