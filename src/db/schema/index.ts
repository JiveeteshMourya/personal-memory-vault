// The single entry point for table definitions, read by both drizzle-kit and the `db` client.
// Each feature phase adds `src/db/schema/<domain>.ts` and re-exports it here:
//   export * from "./<domain>";
// Schema files use relative imports only, because drizzle-kit loads them outside Next.js.
export {};
