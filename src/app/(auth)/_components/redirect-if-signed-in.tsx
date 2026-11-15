import { redirect } from "next/navigation";

import { getCurrentUser } from "@/data/auth";

// A signed-in owner has no business on the sign-in or sign-up page.
export async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
  return null;
}
