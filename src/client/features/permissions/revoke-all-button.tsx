"use client";

import { ShieldOffIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { revokeAllAction } from "@/client/features/permissions/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/client/components/ui/alert-dialog";
import { Button } from "@/client/components/ui/button";
import { toast } from "@/client/components/ui/toast";

/** Removes every grant and source the app holds, after a confirmation. */
export function RevokeAllButton({
  appId,
  appName,
  disabled,
}: {
  appId: string;
  appName: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function revoke() {
    startTransition(async () => {
      const { ok } = await revokeAllAction(appId);
      setOpen(false);
      toast.add(
        ok
          ? { title: `All of ${appName}’s access revoked`, type: "success" }
          : { title: "This app no longer exists", type: "error" }
      );
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" disabled={disabled} />}>
        <ShieldOffIcon data-icon="inline-start" />
        Revoke all
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke all of {appName}’s access?</AlertDialogTitle>
          <AlertDialogDescription>
            Every topic it may read or save, and every source it may read from, is switched off at
            once. Its key keeps working, but it can’t read or save anything until you allow it
            again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={revoke} disabled={pending}>
            {pending ? "Revoking…" : "Revoke all"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
