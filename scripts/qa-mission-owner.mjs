import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
const out=path.resolve('reports/autonomous-mission/run-'+Date.now());fs.mkdirSync(out,{recursive:true});
const home=path.join(out,'cli-home'),cache=path.join(home,'emulators');fs.mkdirSync(cache,{recursive:true});
for(const file of ['cloud-firestore-emulator-v1.19.8.jar','cloud-storage-rules-runtime-v1.1.3.jar'])fs.copyFileSync(path.join('C:/Users/natha/.cache/firebase/emulators',file),path.join(cache,file));
const ports=[8080,9099,9199,4400,4500,9150];async function closed(port){await new Promise((resolve,reject)=>{const p=net.createServer();p.once('error',reject);p.listen(port,'127.0.0.1',()=>p.close(resolve));});}
for(const p of ports)await closed(p);
const env={...process.env,HOME:home,USERPROFILE:home,XDG_CONFIG_HOME:path.join(home,'config'),FIREBASE_EMULATORS_PATH:cache,CI:'true',MISSION_OUTPUT:out,GOAL01_SAME_TAB_PROBE:process.argv.includes('--same-tab-signout-probe')?'true':'false'};
const cli='C:/Users/natha/AppData/Local/npm-cache/_npx/f9d8a3ecface27c9/node_modules/firebase-tools/lib/bin/firebase.js';
const task=process.argv.includes('--goal03-diagnostic')?'scripts/qa-goal03-run.mjs':process.argv.includes('--goal02-diagnostic')?'scripts/qa-goal02-run.mjs':process.argv.includes('--transport-diagnostic')?'scripts/qa-goal01-transport-run.mjs':process.argv.includes('--signout-diagnostic')?'scripts/qa-goal01-signout-probe.mjs':'scripts/qa-mission-run.mjs';
const child=spawn(process.execPath,[cli,'emulators:exec','--project','demo-iopps-preview','--config','firebase.ci.json','--only','firestore,auth,storage',`"${process.execPath}" ${task}`],{env,stdio:['ignore','pipe','pipe']});
let buf='';const log=fs.createWriteStream(path.join(out,'owner.log'));const clean=s=>s.replace(/([?&](?:oobCode|apiKey|token)=)[^\s&"']+/g,'$1[REDACTED]');for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{buf+=chunk;let i;while((i=buf.indexOf('\n'))>=0){const line=clean(buf.slice(0,i+1));buf=buf.slice(i+1);log.write(line);if(/Error:|PASS|FAIL|"output"|BUILD/.test(line))process.stdout.write(line);}});
const timer=setTimeout(()=>{spawnSync('taskkill',['/PID',String(child.pid),'/T','/F']);},20*60*1000);
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});clearTimeout(timer);log.end(clean(buf));const cleanup=[];for(const port of ports){try{await closed(port);cleanup.push({port,closed:true});}catch{cleanup.push({port,closed:false});}}fs.writeFileSync(path.join(out,'owner-cleanup.json'),JSON.stringify({code,cleanup},null,2));console.log(JSON.stringify({output:out,code,cleanup}));process.exitCode=code||cleanup.some(v=>!v.closed)?1:0;
