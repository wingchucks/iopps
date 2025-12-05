/**
 * Environment variable validation
 * Validates required environment variables on startup
 */

type EnvConfig = {
  name: string;
  required: boolean;
  description: string;
};

// Required for the app to function
const requiredEnvVars: EnvConfig[] = [
  { name: 'NEXT_PUBLIC_FIREBASE_API_KEY', required: true, description: 'Firebase client API key' },
  { name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', required: true, description: 'Firebase auth domain' },
  { name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', required: true, description: 'Firebase project ID' },
  { name: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', required: true, description: 'Firebase storage bucket' },
  { name: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', required: true, description: 'Firebase messaging sender ID' },
  { name: 'NEXT_PUBLIC_FIREBASE_APP_ID', required: true, description: 'Firebase app ID' },
];

// Required for server-side operations (API routes)
const serverEnvVars: EnvConfig[] = [
  { name: 'FIREBASE_CLIENT_EMAIL', required: false, description: 'Firebase Admin client email' },
  { name: 'FIREBASE_PRIVATE_KEY', required: false, description: 'Firebase Admin private key' },
];

// Required for payments (can use test mode)
const paymentEnvVars: EnvConfig[] = [
  { name: 'STRIPE_SECRET_KEY', required: false, description: 'Stripe secret key (sk_test_... or sk_live_...)' },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: false, description: 'Stripe publishable key' },
];

// Required for email (optional - logs to console if missing)
const emailEnvVars: EnvConfig[] = [
  { name: 'RESEND_API_KEY', required: false, description: 'Resend API key for sending emails' },
];

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required env vars
  for (const env of requiredEnvVars) {
    if (!process.env[env.name]) {
      errors.push(`Missing required: ${env.name} - ${env.description}`);
    }
  }

  // Check server env vars (warn if missing)
  for (const env of serverEnvVars) {
    if (!process.env[env.name] && !process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      warnings.push(`Missing server config: ${env.name} - ${env.description} (API routes may fail)`);
    }
  }

  // Check payment env vars (warn if missing)
  for (const env of paymentEnvVars) {
    if (!process.env[env.name]) {
      warnings.push(`Missing payment config: ${env.name} - ${env.description} (payments disabled)`);
    }
  }

  // Check email env vars (warn if missing)
  for (const env of emailEnvVars) {
    if (!process.env[env.name]) {
      warnings.push(`Missing email config: ${env.name} - ${env.description} (emails will log to console)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function logEnvValidation(): void {
  const { valid, errors, warnings } = validateEnv();

  if (errors.length > 0) {
    console.error('\n=== ENVIRONMENT CONFIGURATION ERRORS ===');
    errors.forEach(err => console.error(`  ❌ ${err}`));
    console.error('=========================================\n');
  }

  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('\n=== ENVIRONMENT CONFIGURATION WARNINGS ===');
    warnings.forEach(warn => console.warn(`  ⚠️  ${warn}`));
    console.warn('==========================================\n');
  }

  if (valid && errors.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Environment configuration valid');
    }
  }
}

// Run validation on import (server-side only)
if (typeof window === 'undefined') {
  logEnvValidation();
}
