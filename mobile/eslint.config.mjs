import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Mobile is a React Native / Expo app. Keep lint focused on checks that are
// actionable for CI without inheriting the web app's Next.js-only rules.
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "android/**",
      "ios/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "e2e/**",
      "*.js",
      "tmp-*.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        __DEV__: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  }
);
