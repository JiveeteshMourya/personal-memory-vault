// Runs once when a Next.js server starts, before it handles requests.
export async function register() {
  // Validate env up front so a misconfigured server fails fast with a readable message.
  await import("./lib/env");
}
