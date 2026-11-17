/* eslint-disable shadcn/no-restyle, shadcn/no-unknown-classes -- Bug views use reference workspace CSS classes. */

"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import { pickClientBugAction } from "@/features/bugs/bugs-actions";
import { useToastTransition } from "@/hooks/use-toast-transition";

type PickSeverity = "blocker" | "critical" | "major" | "minor" | "trivial";
type PickPriority = "urgent" | "high" | "medium" | "low" | "none";

const SEVERITIES: readonly (readonly [PickSeverity, string])[] = [
  ["blocker", "Blocker"],
  ["critical", "Critical"],
  ["major", "Major"],
  ["minor", "Minor"],
  ["trivial", "Trivial"],
];

const PRIORITIES: readonly (readonly [PickPriority, string])[] = [
  ["urgent", "Urgent"],
  ["high", "High"],
  ["medium", "Medium"],
  ["low", "Low"],
  ["none", "None"],
];

// Picking makes the viewer the sole assignee and triages the bug in one step.
export const BugPickForm = ({
  bugId,
  defaultSeverity,
  expectedVersion,
  onPicked,
}: {
  readonly bugId: string;
  readonly defaultSeverity: PickSeverity;
  readonly expectedVersion: number;
  readonly onPicked?: () => void;
}) => {
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useToastTransition(
    "The bug could not be picked up. Try again."
  );
  const [severity, setSeverity] = useState<PickSeverity>(defaultSeverity);
  const [priority, setPriority] = useState<PickPriority>("medium");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await pickClientBugAction({
        bugId,
        expectedVersion,
        priority,
        severity,
      });
      if (result.ok) {
        onPicked?.();
        return;
      }
      // Losing the race reports who won; refresh so the row reflects it.
      toast.error(result.error.message);
      if (result.error.code === "CONFLICT") {
        router.refresh();
      }
    });
  };

  return (
    <form className="bug-inline-form bug-pick-form" onSubmit={submit}>
      <div className="bug-detail-facts">
        <div className="bug-form-field">
          <Label htmlFor={`${id}-severity`}>Severity</Label>
          <WorkspaceSelect
            onValueChange={(value) => setSeverity(value as PickSeverity)}
            value={severity}
            id={`${id}-severity`}
          >
            {SEVERITIES.map(([value, label]) => (
              <WorkspaceSelectItem key={value} value={value}>
                {label}
              </WorkspaceSelectItem>
            ))}
          </WorkspaceSelect>
        </div>
        <div className="bug-form-field">
          <Label htmlFor={`${id}-priority`}>Priority</Label>
          <WorkspaceSelect
            onValueChange={(value) => setPriority(value as PickPriority)}
            value={priority}
            id={`${id}-priority`}
          >
            {PRIORITIES.map(([value, label]) => (
              <WorkspaceSelectItem key={value} value={value}>
                {label}
              </WorkspaceSelectItem>
            ))}
          </WorkspaceSelect>
        </div>
      </div>
      <Button disabled={pending} type="submit">
        {pending ? "Picking…" : "Pick this bug"}
      </Button>
    </form>
  );
};
