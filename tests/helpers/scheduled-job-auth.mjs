import { sourceModule } from './security-fixtures.mjs';

/** The real scheduled-job check, reading `env` instead of the test process's environment. */
export function scheduledJobAuth(env) {
  return sourceModule('src/lib/server/scheduled-job-auth.ts', { globals: { process: { env } } });
}
