"use client";

import { PlusIcon } from "lucide-react";
import { startTransition, useActionState, useState } from "react";

import { KeyReveal } from "@/client/features/apps/key-reveal";
import { registerAppAction } from "@/client/features/apps/actions";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/client/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";

// Clicking outside doesn't close it, so neither a half-typed form nor an unseen key is lost.
export function RegisterAppButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Register app
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <RegisterAppFlow />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The form, then the new key. It mounts when the dialog opens and unmounts when it closes, which
 * drops the key from memory and starts the next registration fresh.
 */
function RegisterAppFlow() {
  const [state, dispatch, pending] = useActionState(registerAppAction, undefined);

  if (state?.ok) return <KeyReveal appName={state.appName} apiKey={state.key} />;

  const errors = state?.ok === false ? state.errors : undefined;
  const message = state?.ok === false ? state.message : undefined;

  // Submitting through onSubmit (not `action`) keeps React from resetting the fields on an error.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Register an app</DialogTitle>
        <DialogDescription>
          It gets a key that proves who it is. It can’t read or save anything until you grant access
          in Permissions.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
          <Field data-invalid={!!errors?.name}>
            <FieldLabel htmlFor="app-name">Name</FieldLabel>
            <Input
              id="app-name"
              name="name"
              autoComplete="off"
              placeholder="Journal app"
              aria-invalid={!!errors?.name}
              aria-describedby={errors?.name ? "app-name-error" : undefined}
            />
            <FieldError id="app-name-error" errors={errors?.name?.map(message => ({ message }))} />
          </Field>
          <Field data-invalid={!!errors?.description}>
            <FieldLabel htmlFor="app-description">Description (optional)</FieldLabel>
            <Textarea
              id="app-description"
              name="description"
              rows={3}
              placeholder="What the app does, so you recognize it later."
              aria-invalid={!!errors?.description}
              aria-describedby={errors?.description ? "app-description-error" : undefined}
            />
            <FieldError
              id="app-description-error"
              errors={errors?.description?.map(message => ({ message }))}
            />
          </Field>
        </FieldGroup>

        <DialogFooter className="mt-6">
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={pending}>
            {pending ? "Registering…" : "Register app"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
