"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { MemoryForm } from "@/app/(dashboard)/dashboard/memories/_components/memory-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NewMemoryButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        New memory
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New memory</DialogTitle>
          <DialogDescription>
            It’s encrypted before it’s saved. An app sees it only if you allow its category and
            sensitivity.
          </DialogDescription>
        </DialogHeader>
        <MemoryForm onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
