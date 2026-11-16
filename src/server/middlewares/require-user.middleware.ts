import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/lib/auth";
import type { UserDTO } from "@/shared/types/user.types";

/**
 * The signed-in owner, or null. Checks the session against the database, and runs once per
 * render pass however many components ask. Reads the request, so callers in a page or layout
 * render behind a `<Suspense>` boundary.
 */
export const getCurrentUser = cache(async (): Promise<UserDTO | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
});

/**
 * The signed-in owner, or a redirect to `/sign-in`. Every component and Server Action that reads or
 * writes the owner's data starts with it and passes `user.id` to the services, so the check holds
 * even when a request skips the proxy.
 */
export async function requireUser(): Promise<UserDTO> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}
