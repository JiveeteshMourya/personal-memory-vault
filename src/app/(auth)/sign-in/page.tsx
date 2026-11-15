import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/app/(auth)/_components/sign-in-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          <h1>Sign in to your vault</h1>
        </CardTitle>
        <CardDescription>Manage your memories and what each app can read.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm />
      </CardContent>
      <CardFooter className="justify-center gap-1 text-muted-foreground">
        New here?
        <Link
          href="/sign-up"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create a vault
        </Link>
      </CardFooter>
    </Card>
  );
}
