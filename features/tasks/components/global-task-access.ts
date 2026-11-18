"use client";

/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */

/* eslint-disable shadcn/no-restyle */

import type { GlobalTask } from "@/features/tasks/types/global-task-row-contracts";

export const canEditTask = (
  task: GlobalTask,
  userId: string | null,
  isAdmin: boolean
): boolean =>
  isAdmin ||
  task.createdById === userId ||
  task.assigneeIds.includes(userId ?? "");
