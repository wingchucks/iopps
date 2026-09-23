// Owned serial build/browser gate, no providers, real emails, jobs or payments.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import net from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
const out=path.resolve('reports/round6-signout');fs.mkdirSync(out,{recursive:true});
if(process.argv.includes('--inside')){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
 const env={...process.env,USERPROFILE:'C:/Users/natha',LOCALAPPDATA:'C:/Users/natha/AppData/Local',APPDATA:'C:/Users/natha/AppData/Roaming',PROGRAMFILES:'C:/Program Files',TMPDIR:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TEMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch'};
 const results=[];function run(name,args){const r=spawnSync(process.execPath,args,{env,encoding:'utf8',timeout:900000,maxBuffer:50*1024*1024});fs.writeFileSync(path.join(out,name+'.log'),(r.stdout||'')+(r.stderr||''));results.push({name,status:r.status,error:r.error?.message});fs.writeFileSync(path.join(out,'commands.json'),JSON.stringify(results,null,2));console.log(name,r.status);return r.status===0;}
 const built=process.argv.includes('--browser-only')||run('build',['node_modules/next/dist/bin/next','build','--webpack']);
 if(built){run('typecheck',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false']);run('built-browser',['scripts/qa-round6-browser.mjs']);}
 process.exitCode=results.some(r=>r.status!==0)?1:0;
}else{
 const home=path.join(out,'cli-home'),cache=path.join(home,'emulators');fs.mkdirSync(cache,{recursive:true});
 for(const name of ['cloud-firestore-emulator-v1.19.8.jar','cloud-storage-rules-runtime-v1.1.3.jar'])fs.copyFileSync(path.join('C:/Users/natha/.cache/firebase/emulators',name),path.join(cache,name));
 for(const port of [8080,9099,9199,4400])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
 const env={...process.env,HOME:home,USERPROFILE:home,XDG_CONFIG_HOME:path.join(home,'config'),FIREBASE_EMULATORS_PATH:cache,CI:'true'};
 const cli='C:/Users/natha/AppData/Local/npm-cache/_npx/f9d8a3ecface27c9/node_modules/firebase-tools/lib/bin/firebase.js';
 const command=`"${process.execPath}" scripts/qa-round6-emulators.mjs --inside ${process.argv.includes('--browser-only')?'--browser-only':''}`;
 const child=spawn(process.execPath,[cli,'emulators:exec','--project','demo-iopps-preview','--config','firebase.ci.json','--only','firestore,auth,storage',command],{env,stdio:['ignore','pipe','pipe']});
 let buffer='';const output=fs.createWriteStream(path.join(out,'emulators.log'));const clean=s=>s.replace(/([?&](?:oobCode|apiKey|token)=)[^\s&"']+/g,'$1[REDACTED]');
 for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\n'))>=0){const line=clean(buffer.slice(0,i+1));buffer=buffer.slice(i+1);output.write(line);if(/build|typecheck|built-browser|Error:/.test(line))process.stdout.write(line);}});
 process.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});output.end(clean(buffer));
 for(const port of [8080,9099,9199,4400])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});fs.writeFileSync(path.join(out,'ports-closed.json'),JSON.stringify({ports:[8080,9099,9199,4400],closed:true}));
}
