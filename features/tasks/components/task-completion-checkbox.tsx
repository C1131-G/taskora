/* eslint-disable shadcn/no-unknown-classes */

"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { changeTaskColumnAction } from "@/features/tasks/tasks-actions";

const TaskCompletionCheckbox = ({
  taskId,
  title,
  status,
  version,
}: {
  readonly taskId: string;
  readonly title: string;
  readonly status: "backlog" | "todo" | "progress" | "review" | "done";
  readonly version: number;
}) => {
  const [pending, startTransition] = useTransition();
  // The box ticks at once; the action's revalidation brings the saved status,
  // and a failed save falls back to it.
  const [completed, setOptimisticCompleted] = useOptimistic(status === "done");

  const setCompleted = (checked: boolean) =>
    startTransition(async () => {
      setOptimisticCompleted(checked);
      try {
        const result = await changeTaskColumnAction({
          expectedVersion: version,
          idempotencyKey: crypto.randomUUID(),
          status: checked ? "done" : "todo",
          taskId,
        });
        if (!result.ok) {
          toast.error(result.error.message);
        }
      } catch {
        toast.error("The task status could not be changed. Try again.");
      }
    });

  return (
    <span className="home-task-completion">
      <Checkbox
        aria-label={`${completed ? "Reopen" : "Complete"} ${title}`}
        checked={completed}
        disabled={pending}
        onCheckedChange={(checked) => {
          if (typeof checked === "boolean") {
            setCompleted(checked);
          }
        }}
      />
    </span>
  );
};

export { TaskCompletionCheckbox };
