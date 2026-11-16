"use client";

import { useActionState } from "react";

import { signIn } from "@/client/features/auth/actions";
import { Button } from "@/client/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";

// Validation happens on the server (noValidate), so every error reads the same way.
export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  const errors = state?.errors;

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors?.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            defaultValue={state?.values?.email}
            aria-invalid={!!errors?.email}
            aria-describedby={errors?.email ? "email-error" : undefined}
          />
          <FieldError id="email-error" errors={errors?.email?.map(message => ({ message }))} />
        </Field>
        <Field data-invalid={!!errors?.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={!!errors?.password}
            aria-describedby={errors?.password ? "password-error" : undefined}
          />
          <FieldError
            id="password-error"
            errors={errors?.password?.map(message => ({ message }))}
          />
        </Field>
        {state?.message && <FieldError>{state.message}</FieldError>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}
