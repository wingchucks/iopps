import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn} from 'node:child_process';
const home=fs.mkdtempSync('C:/Users/natha/AppData/Local/hermes/cache/scratch/qa-round2-home-');
for(const port of [8080,9099,9199,4400,4500]) await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(path.join(home,'.cache/firebase'),{recursive:true});
fs.cpSync(path.join(os.homedir(),'.cache/firebase/emulators'),path.join(home,'.cache/firebase/emulators'),{recursive:true});
const env={...process.env,HOME:home,USERPROFILE:home,APPDATA:path.join(home,'appdata'),XDG_CONFIG_HOME:path.join(home,'config'),FIREBASE_CLI_DISABLE_UPDATE_CHECK:'true',CI:'true'};
const command=process.argv.includes('--employer-browser') ? `"${process.execPath}" --import "${new URL('./test-typescript-loader.mjs',import.meta.url).href}" scripts/qa-employer-browser.mjs` : process.argv.includes('--employer-suite') ? `"${process.execPath}" scripts/qa-employer-integration-run.mjs` : process.argv.includes('--browser-only') ? `"${process.execPath}" --import "${new URL('./test-typescript-loader.mjs',import.meta.url).href}" scripts/qa-round2-browser.mjs` : `"${process.execPath}" scripts/qa-round2-integration-run.mjs`;
const child=spawn(process.execPath,['C:/Users/natha/AppData/Local/npm-cache/_npx/f9d8a3ecface27c9/node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec','--project','demo-iopps-preview','--config','firebase.ci.json','--only','firestore,auth,storage',command],{env,stdio:['ignore','pipe','pipe']});
// Auth emulator prints single-use verification URLs; redact before any persisted output.
for(const stream of [child.stdout,child.stderr]){let pending='';stream.on('data',chunk=>{pending+=chunk.toString();const lines=pending.split('\n');pending=lines.pop();for(const line of lines)console.log(line.replace(/https?:\/\/\S*(?:oobCode|apiKey)=\S*/g,'[REDACTED emulator action URL]'));});stream.on('end',()=>{if(pending)console.log(pending.replace(/https?:\/\/\S*(?:oobCode|apiKey)=\S*/g,'[REDACTED emulator action URL]'));});}
child.on('exit',code=>{fs.rmSync(home,{recursive:true,force:true});process.exitCode=code??1;});
