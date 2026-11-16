"use client";

import { useActionState } from "react";

import { signUp } from "@/client/features/auth/actions";
import { Button } from "@/client/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";

// Validation happens on the server (noValidate), so every error reads the same way.
export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  const errors = state?.errors;

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors?.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            defaultValue={state?.values?.name}
            aria-invalid={!!errors?.name}
            aria-describedby={errors?.name ? "name-error" : undefined}
          />
          <FieldError id="name-error" errors={errors?.name?.map(message => ({ message }))} />
        </Field>
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
            autoComplete="new-password"
            required
            aria-invalid={!!errors?.password}
            aria-describedby={errors?.password ? "password-error" : "password-hint"}
          />
          {errors?.password ? (
            <FieldError
              id="password-error"
              errors={errors.password.map(message => ({ message }))}
            />
          ) : (
            <FieldDescription id="password-hint">At least 8 characters.</FieldDescription>
          )}
        </Field>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating your vault…" : "Create vault"}
        </Button>
      </FieldGroup>
    </form>
  );
}
