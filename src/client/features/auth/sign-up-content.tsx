import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { SignUpForm } from "@/client/features/auth/sign-up-form";

export function SignUpContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          <h1>Create your vault</h1>
        </CardTitle>
        <CardDescription>
          Your account owns the vault. No app reads from it until you allow it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
      <CardFooter className="justify-center gap-1 text-muted-foreground">
        Already have a vault?
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
