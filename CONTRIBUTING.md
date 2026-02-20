# Contributing to IOPPS

## Development Workflow

1. Create a branch: `git checkout -b feature/your-feature`
2. Make changes in `src/`
3. Commit and push your branch
4. Open a Pull Request targeting `master`
5. Get approval (required)
6. Merge — Vercel auto-deploys

**Direct pushes to master are blocked by branch protection.**

## Project Structure

```
src/
  app/        — Next.js pages and API routes
  components/ — Shared React components
  lib/        — Utilities, Firebase config, Firestore helpers
  middleware.ts — Auth middleware
```

## Rules

- TypeScript only (.tsx/.ts)
- Custom UI components (no shadcn)
- `jobs` collection for jobs, NOT `posts`
- Real data only — no seeded/fake data in production
