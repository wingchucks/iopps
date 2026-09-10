// Start a credential-minimized QA server; never attach to an unknown localhost app.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';

export async function startIsolatedQaServer({ maintenanceMode } = {}) {
  assert.ok(maintenanceMode === undefined || maintenanceMode === 'paused', 'Unsupported QA maintenance mode');
  const directory = process.env.QA_BUILD_DIR;
  assert.ok(directory, 'QA_BUILD_DIR must point to the prepared credential-free build');
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    let exists = false;
    try { await fs.access(path.join(directory, name)); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    assert.equal(exists, false, `Refusing build directory with ${name}`);
  }
  await fs.access(path.join(directory, '.next', 'BUILD_ID'));
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const env = {};
  for (const key of ['SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'PROGRAMFILES', 'PROGRAMDATA']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, {
    NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', GCLOUD_PROJECT: 'demo-iopps-preview',
    NEXT_PUBLIC_USE_EMULATORS: 'true', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-iopps-preview',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'fictional-emulator-key', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-iopps-preview.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-iopps-preview.appspot.com', NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED: 'false',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  });
  if (maintenanceMode) env.IOPPS_MAINTENANCE_MODE = maintenanceMode;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; let spawnError;
  child.on('error', error => { spawnError = error; });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { logs = (logs + chunk.toString()).slice(-4000); });
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited;
  };
  try {
    const deadline = Date.now() + 30000;
    while (!logs.includes('Ready in')) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw new Error(`QA server exited: ${logs}`);
      if (Date.now() > deadline) throw new Error(`QA server readiness timeout: ${logs}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Readiness must not depend on homepage database queries under a parallel emulator suite.
    // Allow bounded cold route loading while the complete test suite saturates local workers.
    const health = await fetch(base + (maintenanceMode ? '/api/launch-status' : '/api/applications'), { redirect: 'error', signal: AbortSignal.timeout(30000) });
    assert.equal(health.status, maintenanceMode ? 200 : 401);
    return { base, stop };
  } catch (error) { await stop(); throw new Error(`Isolated QA startup failed: ${logs}`, { cause: error }); }
}
