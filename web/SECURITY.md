# Security Guidelines

## API Key Management

### Environment Variables

This project uses several API keys and secrets that must be kept secure:

- **Google AI API Key** (`GOOGLE_AI_API_KEY`): Used for AI-powered job description generation and poster analysis
- **Firebase Configuration**: Various Firebase service keys
- **Stripe Keys**: Payment processing credentials
- **Sentry DSN**: Error monitoring configuration
- **Resend API Key**: Email service credentials

### Best Practices

1. **Never commit API keys to version control**
   - All `.env*` files are ignored by `.gitignore`
   - Use `.env.local` for local development
   - Use platform-specific environment variables for production (e.g., Vercel, AWS)

2. **Use `.env.example` as a template**
   - Copy `.env.example` to `.env.local`
   - Replace placeholder values with your actual credentials
   - Never put real keys in `.env.example`

3. **Rotate compromised keys immediately**
   - If you accidentally commit a key, assume it's compromised
   - Revoke the key immediately in the service's console
   - Generate a new key and update your environment

4. **Environment-specific configurations**
   - Use different keys for development, staging, and production
   - Never use production keys in development environments

### API Key Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] `.env.example` contains only placeholder values
- [ ] No hardcoded API keys in source code
- [ ] API keys are loaded from `process.env` only
- [ ] Production keys are stored in secure environment variable systems
- [ ] Different keys are used for different environments

### What to Do If a Key Is Exposed

1. **Immediately revoke the exposed key** in the service's console:
   - Google AI: https://makersuite.google.com/app/apikey
   - Stripe: https://dashboard.stripe.com/apikeys
   - Firebase: https://console.firebase.google.com/
   - Sentry: https://sentry.io/settings/
   - Resend: https://resend.com/api-keys

2. **Generate a new key** and update your environment variables

3. **Review access logs** to check if the key was used maliciously

4. **If committed to git:**
   - Remove the key from the repository history (use tools like `git-filter-repo` or BFG Repo-Cleaner)
   - Force push the cleaned repository
   - Notify all team members to re-clone

## Code Security

### Current Security Measures

1. **Environment Variable Usage**
   - All API keys are loaded from `process.env`
   - No hardcoded credentials in source code
   - Proper validation before using API keys

2. **Rate Limiting**
   - API endpoints have rate limiting enabled
   - Prevents abuse of AI-powered features

3. **Input Validation**
   - File type and size validation for image uploads
   - Request body validation for API endpoints

### Security Audit

Last security audit performed: 2025-12-05

Key findings:
- GOOGLE_AI_API_KEY properly loaded from environment variables
- No hardcoded API keys found in source code
- .gitignore properly configured to exclude .env files
- .env.example contains only placeholder values

## Reporting Security Issues

If you discover a security vulnerability, please email security@iopps.ca instead of using the public issue tracker.
