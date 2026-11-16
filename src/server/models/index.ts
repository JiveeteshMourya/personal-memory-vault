// The single entry point for table definitions, read by both drizzle-kit and the `db` client.
// Each feature phase adds `src/server/models/<entity>.model.ts` and re-exports it here:
//   export * from "./<entity>.model";
// Model files use relative imports only, because drizzle-kit loads them outside Next.js.
export * from "./access-event.model";
export * from "./app.model";
export * from "./auth.model";
export * from "./consent.model";
export * from "./grant.model";
export * from "./memory.model";
