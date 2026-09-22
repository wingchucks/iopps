// Owns only a credential-minimized component fixture child, never a Next build.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const env={};
const allow=new Set(['PATH','HOME','SYSTEMROOT','SYSTEMDRIVE','WINDIR','COMSPEC','PATHEXT','PROGRAMFILES','PROGRAMFILES(X86)','PROGRAMW6432','USERPROFILE','LOCALAPPDATA','APPDATA','TEMP','TMP','TMPDIR']);
for(const [key,value] of Object.entries(process.env))if(allow.has(key.toUpperCase()))env[key]=value;
const scratch=process.env.TMPDIR || (process.platform==='win32'?path.join(os.homedir(),'AppData/Local/hermes/cache/scratch'):os.tmpdir());
Object.assign(env,{TMPDIR:scratch,TEMP:scratch,TMP:scratch,NEXT_TELEMETRY_DISABLED:'1'});
const report='reports/round5/remaining-avatar';fs.mkdirSync(report,{recursive:true});
const files=['src/components/AccountAvatarMenu.tsx','src/components/NavBar.tsx','src/app/setup/page.tsx','src/app/profile/page.tsx','tests/round5-avatar-browser.test.mjs'];
const hashes=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const run=spawnSync(process.execPath,['--test','--test-reporter=tap','tests/round5-avatar-browser.test.mjs'],{env,encoding:'utf8',timeout:180000});
const output=(run.stdout||'')+(run.stderr||'');fs.writeFileSync(path.join(report,'chrome-green.tap'),output);process.stdout.write(output);
fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify({node:process.version,status:run.status,signal:run.signal,error:run.error?.message,hashes,scope:'Credential-minimized exact React TSX, Chrome, fictional adapters, loopback-only requests; not full Next/Firebase acceptance'},null,2));
process.exitCode=run.status??1;
