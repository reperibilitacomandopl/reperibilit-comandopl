import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "build/**",
    "next-env.d.ts",
    // Custom ignores to quiet terminal
    "*.js",
    "scripts/**",
    "worker-development.js",
    "src/utils/sync-shift.ts",
    "update_squadre.js",
    "verbatel-injector.js",
    "verbatel-*.js",
    "test-*.js",
  ]),
]);

export default eslintConfig;
