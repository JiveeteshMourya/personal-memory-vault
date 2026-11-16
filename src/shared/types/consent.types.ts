import type { MemoryCategory, Sensitivity } from "@/shared/constants/memory-taxonomy";
import type { GrantOperation } from "@/shared/constants/permissions";
import type { AccessSource } from "@/shared/types/grant.types";

/** A request waiting for the owner, with the app's reason decrypted. */
export type ConsentRequestDTO = {
  id: string;
  appId: string;
  appName: string;
  operation: GrantOperation;
  /** In taxonomy order. */
  categories: MemoryCategory[];
  maxSensitivity: Sensitivity;
  reason: string;
  createdAt: Date;
};

/** What the owner allows when approving: the request itself, or a narrower part of it. */
export type ConsentDecision = {
  categories: MemoryCategory[];
  maxSensitivity: Sensitivity;
  /** Reads only: sources to allow on top of those the app already has. */
  sources: AccessSource[];
};
