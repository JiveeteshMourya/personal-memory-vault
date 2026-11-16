"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";

import { MemoryForm } from "@/client/features/memories/memory-form";
import { deleteMemoryAction } from "@/client/features/memories/actions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/client/components/ui/dialog";
import { toast } from "@/client/components/ui/toast";
import type { MemoryDTO } from "@/shared/types/memory.types";

export function MemoryRowActions({ memory }: { memory: MemoryDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  function confirmDelete() {
    startDelete(async () => {
      const { ok } = await deleteMemoryAction(memory.id);
      setDeleteOpen(false);
      toast.add(
        ok
          ? { title: "Memory deleted", type: "success" }
          : { title: "This memory no longer exists", type: "error" }
      );
    });
  }

  return (
    <div className="flex justify-end gap-0.5">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit memory" />}>
          <PencilIcon />
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit memory</DialogTitle>
            <DialogDescription>Your changes are encrypted before they’re saved.</DialogDescription>
          </DialogHeader>
          <MemoryForm memory={memory} onSaved={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Delete memory" />}
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              It’s removed from your vault for good. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
