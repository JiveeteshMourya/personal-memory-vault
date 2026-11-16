import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Layer boundaries (docs/dev-phases/phase-index.md, Conventions). Repositories never check the
// session, so only services may call them, after `requireUser` or `requireApp` has run.
const ban = (group, message) => ({ group, message });
const noClient = ban(["@/client/*"], "The server and shared code never depend on the client.");
const noServer = ban(["@/server/*"], "Shared code is client-safe: it never imports server code.");
const noRepository = ban(
  ["@/server/repository/*"],
  "Call a service instead: only services reach repositories, after authorization."
);
const noDatabase = ban(
  ["@/server/lib/db", "@/server/lib/qdrant", "@/server/models", "@/server/models/*"],
  "Only repositories touch the database and the vector index."
);
const restrict = (files, ...patterns) => ({
  files,
  rules: { "no-restricted-imports": ["error", { patterns }] },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  restrict(["src/shared/**"], noServer, noClient),
  restrict(["src/app/**", "src/client/**"], noRepository, noDatabase),
  restrict(
    ["src/server/controllers/**", "src/server/middlewares/**"],
    noClient,
    noRepository,
    noDatabase
  ),
  restrict(["src/server/services/**"], noClient, noDatabase),
  restrict(["src/server/repository/**", "src/server/models/**", "src/server/lib/**"], noClient),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
