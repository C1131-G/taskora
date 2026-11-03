"use client";

import { useTransition } from "react";
import { toast } from "sonner";

// Keep action failures visible even when a request rejects unexpectedly.
export const useToastTransition = (fallback: string) => {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<void>): void => {
    startTransition(async () => {
      try {
        await action();
      } catch {
        toast.error(fallback);
      }
    });
  };
  return [pending, run] as const;
};
