/* eslint-disable shadcn/no-unknown-classes */

"use client";

import { useId, useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { setTaskClientVisibilityAction } from "@/features/tasks/tasks-actions";

// Lets the people who can edit a task choose whether the client portal lists
// it (title, status and due date only) in the project it belongs to.
export const TaskClientVisibility = ({
  clientVisible,
  editable,
  onReload,
  onVersionChange,
  taskId,
  version,
}: {
  readonly clientVisible: boolean;
  readonly editable: boolean;
  readonly onReload: () => Promise<void>;
  readonly onVersionChange: (version: number) => void;
  readonly taskId: string;
  readonly version: number;
}) => {
  const questionId = useId();
  const hintId = useId();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(clientVisible);

  const change = (visible: boolean) => {
    if (pending || !editable) {
      return;
    }
    startTransition(async () => {
      setShown(visible);
      try {
        const result = await setTaskClientVisibilityAction({
          expectedVersion: version,
          idempotencyKey: crypto.randomUUID(),
          taskId,
          visible,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        onVersionChange(result.data.version);
        await onReload();
      } catch {
        toast.error(
          "Task visibility could not be updated or refreshed. Try again."
        );
      }
    });
  };

  return (
    <section className="stack">
      <h3>Client portal</h3>
      <div className="setting-row is-stacked">
        <div className="setting-copy">
          <span className="setting-title" id={questionId}>
            Who can see this task?
          </span>
          <span className="setting-hint" id={hintId}>
            Clients see only the title, status and due date, and only when the
            project is shared with their company.
          </span>
        </div>
        <div
          aria-describedby={hintId}
          aria-labelledby={questionId}
          className="choice-pair"
          role="radiogroup"
        >
          <label className="choice">
            <input
              checked={!shown}
              className="sr-only"
              disabled={!editable || pending}
              name={`client-visibility-${taskId}`}
              onChange={() => change(false)}
              type="radio"
              value="team"
            />
            <span>Team only</span>
          </label>
          <label className="choice">
            <input
              checked={shown}
              className="sr-only"
              disabled={!editable || pending}
              name={`client-visibility-${taskId}`}
              onChange={() => change(true)}
              type="radio"
              value="team-and-client"
            />
            <span>Team and client</span>
          </label>
        </div>
      </div>
    </section>
  );
};
