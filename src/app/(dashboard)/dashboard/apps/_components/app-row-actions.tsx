"use client";

import { BanIcon, EllipsisIcon, KeyRoundIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";

import { KeyReveal } from "@/app/(dashboard)/dashboard/apps/_components/key-reveal";
import {
  createApiKeyAction,
  deleteAppAction,
  revokeApiKeyAction,
} from "@/app/(dashboard)/dashboard/apps/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

type Confirmation = "replace" | "revoke" | "delete";

const GONE = { title: "This app or key no longer exists", type: "error" } as const;

export function AppRowActions({
  appId,
  appName,
  activeKeyId,
}: {
  appId: string;
  appName: string;
  activeKeyId: string | null;
}) {
  // Kept after closing, so the dialog's text doesn't change while it animates out.
  const [confirmation, setConfirmation] = useState<Confirmation>("delete");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function ask(kind: Confirmation) {
    setConfirmation(kind);
    setConfirmOpen(true);
  }

  function issueKey() {
    startTransition(async () => {
      const result = await createApiKeyAction(appId);
      setConfirmOpen(false);
      if (!result.ok) {
        toast.add(GONE);
        return;
      }
      setNewKey(result.key);
      setRevealOpen(true);
    });
  }

  function runConfirmed() {
    if (confirmation === "replace") {
      issueKey();
      return;
    }
    startTransition(async () => {
      const { ok } =
        confirmation === "revoke"
          ? await revokeApiKeyAction(activeKeyId ?? "")
          : await deleteAppAction(appId);
      setConfirmOpen(false);
      toast.add(
        !ok
          ? GONE
          : {
              title: confirmation === "revoke" ? `${appName}’s key revoked` : `${appName} deleted`,
              type: "success",
            }
      );
    });
  }

  const prompts: Record<Confirmation, { title: string; description: string; action: string }> = {
    replace: {
      title: `Replace ${appName}’s key?`,
      description:
        "The current key stops working right away. Give the app its new key to reconnect it.",
      action: "Replace key",
    },
    revoke: {
      title: `Revoke ${appName}’s key?`,
      description: "The app can’t reach your vault until you issue it a new key.",
      action: "Revoke key",
    },
    delete: {
      title: `Delete ${appName}?`,
      description:
        "Its key stops working and the app is removed. Memories it saved stay in your vault.",
      action: "Delete app",
    },
  };
  const { title, description, action } = prompts[confirmation];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${appName}`} />}
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            {activeKeyId ? (
              <>
                <DropdownMenuItem onClick={() => ask("replace")}>
                  <RefreshCwIcon />
                  Replace key
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => ask("revoke")}>
                  <BanIcon />
                  Revoke key
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={issueKey} disabled={pending}>
                <KeyRoundIcon />
                New key
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onClick={() => ask("delete")}>
              <Trash2Icon />
              Delete app
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmation === "replace" ? "default" : "destructive"}
              onClick={runConfirmed}
              disabled={pending}
            >
              {pending ? "Working…" : action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* The key leaves memory once the dialog has finished closing. */}
      <Dialog
        open={revealOpen}
        onOpenChange={setRevealOpen}
        onOpenChangeComplete={open => !open && setNewKey(null)}
        disablePointerDismissal
      >
        <DialogContent className="sm:max-w-lg">
          {newKey && <KeyReveal appName={appName} apiKey={newKey} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
