import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

test('browser-only integration refuses a missing build before running anything',()=>{
 const cwd=fs.mkdtempSync(path.join(process.env.TMPDIR||os.tmpdir(),'round5-no-build-'));
 try{
  const script=fileURLToPath(new URL('../scripts/qa-round5-integration.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[script,'--browser-only'],{cwd,encoding:'utf8',timeout:10000,env:{...process.env,GCLOUD_PROJECT:'demo-iopps-preview',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'}});
  assert.equal(result.status,1);
  assert.match(result.stderr,/browser-only requires an existing .next\/BUILD_ID/);
  assert.equal(fs.existsSync(path.join(cwd,'reports')),false);
 }finally{fs.rmSync(cwd,{recursive:true,force:true});}
});
