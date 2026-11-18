"use client";

/* eslint-disable shadcn/no-restyle */

/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "@/features/projects/automation-labels";
import type { ConditionField } from "@/src/server/automation/automation-model";

export interface Option {
  readonly id: string;
  readonly label: string;
}

export const entriesOf = (labels: Readonly<Record<string, string>>): Option[] =>
  Object.entries(labels).map(([id, label]) => ({ id, label }));

export const optionsFor = (
  field: ConditionField,
  people: readonly Option[],
  labels: readonly Option[]
): readonly Option[] => {
  switch (field) {
    case "status": {
      return entriesOf(STATUS_LABELS);
    }
    case "priority": {
      return entriesOf(PRIORITY_LABELS);
    }
    case "taskType": {
      return entriesOf(TASK_TYPE_LABELS);
    }
    case "assignee": {
      return people;
    }
    case "label": {
      return labels;
    }
    default: {
      const unhandled: never = field;
      return unhandled;
    }
  }
};

export const displayProps = (
  options: readonly Option[],
  value: string,
  placeholder: string | undefined
): { readonly displayValue?: string } => {
  const label =
    options.find((option) => option.id === value)?.label ?? placeholder;
  return label === undefined ? {} : { displayValue: label };
};
