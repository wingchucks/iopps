// Outer owner is run via the inspected environment-allowlisting QA runner.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
const home=path.resolve('reports/round5/cli-home');fs.mkdirSync(home,{recursive:true});
const cache=path.join(home,'emulators');fs.mkdirSync(cache,{recursive:true});
for(const file of ['cloud-firestore-emulator-v1.19.8.jar','cloud-storage-rules-runtime-v1.1.3.jar'])fs.copyFileSync(path.join('C:/Users/natha/.cache/firebase/emulators',file),path.join(cache,file));
for(const port of [8080,9099,9199,4400])await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});
const env={...process.env,HOME:home,USERPROFILE:home,XDG_CONFIG_HOME:path.join(home,'config'),FIREBASE_EMULATORS_PATH:cache,CI:'true'};
const cli='C:/Users/natha/AppData/Local/npm-cache/_npx/f9d8a3ecface27c9/node_modules/firebase-tools/lib/bin/firebase.js';
const command=`"${process.execPath}" scripts/qa-round5-integration.mjs ${process.argv.includes('--browser-only')?'--browser-only':''}`;
const child=spawn(process.execPath,[cli,'emulators:exec','--project','demo-iopps-preview','--config','firebase.ci.json','--only','firestore,auth,storage',command],{env,stdio:['ignore','pipe','pipe']});
let buffer='';const clean=text=>String(text).replace(/([?&](?:oobCode|apiKey|token)=)[^\s&"']+/g,'$1[REDACTED]');
const output=fs.createWriteStream(path.resolve('reports/round5/emulator-owner.log'));
for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{buffer+=chunk.toString();let i;while((i=buffer.indexOf('\n'))>=0){const line=clean(buffer.slice(0,i+1));buffer=buffer.slice(i+1);output.write(line);if(/(?:build|typecheck|lint|full-suite|browser) (?:0|1)|All emulators ready|Error:/.test(line))process.stdout.write(line);}});
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});output.end(clean(buffer));process.exitCode=code;
