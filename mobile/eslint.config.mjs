import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Mobile is a React Native / Expo app, not a Next.js app. The root config's
// Next preset is inherited for baseline TS rules, but several rules only make
// sense for a Next web app or are too strict to usefully enforce right now.
// Downgrade them to warnings so CI stays green while the signal is preserved.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "node_modules/**",
    ".expo/**",
    "android/**",
    "ios/**",
    "dist/**",
    "build/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      // eslint-plugin-react-hooks v5 rules target React Compiler semantics
      // that don't apply cleanly to this RN codebase yet. Downgrade to warn
      // so they surface in editors without blocking CI.
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/unsupported-syntax": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/config": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/component-hook-factories": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/fbt": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/gating": "warn",
      "react-hooks/globals": "warn",
      "react/no-unescaped-entities": "warn",
      "jsx-a11y/alt-text": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
