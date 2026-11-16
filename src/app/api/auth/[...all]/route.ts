import { authHandler } from "@/server/lib/auth";

// Better Auth's HTTP endpoints (e.g. `GET /api/auth/ok`). The app's own forms use Server Actions.
export const { GET, POST } = authHandler;
