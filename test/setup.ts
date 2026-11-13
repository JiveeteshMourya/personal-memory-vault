import { mock } from "bun:test";

// `server-only` throws outside React Server Components. Tests run server code directly.
mock.module("server-only", () => ({}));
