// Run only local QA with an explicit environment allowlist. Never load .env or
// pass Firebase/Stripe/email credentials through to a build or test process.
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const mode = args[0]?.startsWith('--') ? args.shift() : undefined;
if (mode && !['--emulators', '--maintenance', '--baseline'].includes(mode)) throw new Error('Unknown QA mode');
if (!args.length) throw new Error('Usage: node scripts/run-isolated-qa.mjs [--emulators|--maintenance|--baseline] command [args...]');
for (const file of ['.env', '.env.local', '.env.production', '.env.production.local', '.env.test', '.env.test.local', '.env.development', '.env.development.local']) {
  if (existsSync(file)) throw new Error(`Refusing QA in a directory containing ${file}`);
}
const env = {};
for (const key of ['PATH', 'HOME', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'TMPDIR', 'JAVA_HOME', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY']) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, { NEXT_TELEMETRY_DISABLED: '1', NODE_USE_SYSTEM_CA: '1', NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS: '1', PUPPETEER_SKIP_DOWNLOAD: 'true' });
if (mode === '--baseline') env.IOPPS_SECURITY_BASELINE = 'true';
if (mode === '--emulators' || mode === '--maintenance') {
  const maintenance = mode === '--maintenance';
  const project = maintenance ? 'demo-iopps-launch-freeze' : 'demo-iopps-preview';
  Object.assign(env, {
    IOPPS_TEST_EMULATORS: 'true', NEXT_PUBLIC_USE_EMULATORS: 'true', QA_BUILD_DIR: process.cwd(),
    GCLOUD_PROJECT: project, NEXT_PUBLIC_FIREBASE_PROJECT_ID: project,
    NEXT_PUBLIC_FIREBASE_API_KEY: 'fictional-emulator-key', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${project}.firebaseapp.com`,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${project}.appspot.com`, NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED: 'false',
    FIRESTORE_EMULATOR_HOST: `127.0.0.1:${maintenance ? 8180 : 8080}`,
    FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${maintenance ? 9299 : 9099}`,
    FIREBASE_STORAGE_EMULATOR_HOST: `127.0.0.1:${maintenance ? 9399 : 9199}`,
  });
}
const child = spawn(args[0], args.slice(1), { env, stdio: 'inherit', shell: false });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
