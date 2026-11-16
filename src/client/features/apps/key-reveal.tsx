"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/client/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { toast } from "@/client/components/ui/toast";

/**
 * A newly issued key, shown this once inside a dialog. The vault keeps only its hash, so closing the
 * dialog is the last chance to copy it.
 */
export function KeyReveal({ appName, apiKey }: { appName: string; apiKey: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.add({ title: "Key copied", type: "success" });
    } catch {
      toast.add({ title: "Couldn’t copy. Select the key and copy it yourself.", type: "error" });
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{appName}’s key</DialogTitle>
        <DialogDescription>
          Copy it now: you won’t see it again. Keep it on the app’s server, never in a browser.
        </DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor="api-key">API key</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="api-key"
            readOnly
            value={apiKey}
            className="font-mono"
            onFocus={event => event.currentTarget.select()}
          />
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <CopyIcon data-icon="inline-start" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <FieldDescription>
          It proves who the app is, nothing more. The app can’t read or save memories until you
          grant access in Permissions.
        </FieldDescription>
      </Field>
      <DialogFooter>
        <DialogClose render={<Button />}>Done</DialogClose>
      </DialogFooter>
    </>
  );
}
