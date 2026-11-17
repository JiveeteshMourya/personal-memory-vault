import { z } from "zod";
import { MEMORY_CATEGORIES, SENSITIVITY_TIERS } from "@/shared/constants/memory-taxonomy";
import { GRANT_OPERATIONS } from "@/shared/constants/permissions";

// docs/public-api.md, `POST /consent-requests`.
export const consentRequestSchema = z.strictObject({
  operation: z.enum(GRANT_OPERATIONS),
  categories: z.array(z.enum(MEMORY_CATEGORIES)).min(1).max(MEMORY_CATEGORIES.length),
  maxSensitivity: z.enum(SENSITIVITY_TIERS).default("personal"),
  reason: z.string().trim().min(1).max(300),
});
