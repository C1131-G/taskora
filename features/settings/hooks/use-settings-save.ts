"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useWorkspaceUndo } from "@/components/workspace/workspace-undo";

// Pending/error state for a settings form, plus the polite "Saved" notice a
// successful save would otherwise leave out.
const useSaveState = () => {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const reportError = (message: string | null): void => {
    setError(message);
    if (message) {
      toast.error(message);
    }
  };
  const { notifySaved } = useWorkspaceUndo();
  const saved = (label: string): void => {
    setError(null);
    notifySaved(label);
  };
  const runSave = (action: () => void | Promise<void>): void => {
    startTransition(async () => {
      try {
        await action();
      } catch {
        reportError("Your changes could not be saved. Try again.");
      }
    });
  };
  return {
    error,
    pending,
    saved,
    setError: reportError,
    startTransition: runSave,
  };
};

export { useSaveState };
