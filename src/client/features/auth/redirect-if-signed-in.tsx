import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/middlewares/require-user.middleware";

// A signed-in owner has no business on the sign-in or sign-up page.
export async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
  return null;
}
