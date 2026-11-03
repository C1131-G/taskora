"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { useWorkspaceUndo } from "@/components/workspace/workspace-undo";
import { subscribeToRealtimeRefresh } from "@/features/realtime/realtime-signal";
import type { TaskCommentView } from "@/features/tasks/components/task-comment-parts";
import {
  createCommentAction,
  listTaskCommentsAction,
  removeCommentAction,
  toggleCommentReactionAction,
  undoCommentRemovalAction,
} from "@/features/tasks/tasks-actions";
import type { CommentVisibility } from "@/src/server/collaboration/contracts";

// Comment state and actions for one task. A removal is undone from the global
// Undo stack, so it works after the drawer has closed.
export const useTaskComments = ({
  allowPublicReplies = false,
  initialComments = [],
  taskId,
}: {
  readonly allowPublicReplies?: boolean;
  readonly initialComments?: readonly TaskCommentView[];
  readonly taskId: string;
}) => {
  const { addUndo } = useWorkspaceUndo();
  const [pending, startTransition] = useTransition();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<CommentVisibility>("internal");

  const refresh = useCallback(async () => {
    try {
      const result = await listTaskCommentsAction({ taskId });
      if (result.ok) {
        setComments(result.data);
      } else {
        toast.error(result.error.message);
      }
    } catch {
      toast.error("Comments could not be refreshed. Try again.");
    }
  }, [taskId]);

  // Another person's comment arrives as a server event; this list is client
  // state, so it reads again when the page does.
  useEffect(
    () =>
      subscribeToRealtimeRefresh(() => {
        void refresh();
      }),
    [refresh]
  );

  const submit = () =>
    startTransition(async () => {
      try {
        const result = await createCommentAction({
          body: body.trim(),
          idempotencyKey: crypto.randomUUID(),
          taskId,
          ...(allowPublicReplies && visibility === "public"
            ? { visibility }
            : {}),
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        setBody("");
        setVisibility("internal");
        await refresh();
      } catch {
        toast.error("Your comment could not be sent. Try again.");
      }
    });

  const remove = (commentId: string) =>
    startTransition(async () => {
      try {
        const result = await removeCommentAction({
          commentId,
          idempotencyKey: crypto.randomUUID(),
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        setComments((current) =>
          current.filter((comment) => comment.id !== commentId)
        );
        const { expiresAt, undoId } = result.data;
        addUndo({
          expiresAt,
          label: "Comment removed",
          run: async () => {
            const undo = await undoCommentRemovalAction({
              idempotencyKey: crypto.randomUUID(),
              undoId,
            });
            if (!undo.ok) {
              return undo.error.message;
            }
            await refresh();
            return null;
          },
        });
      } catch {
        toast.error("The comment could not be removed. Try again.");
      }
    });

  const react = (comment: TaskCommentView, emoji: string) =>
    startTransition(async () => {
      try {
        const result = await toggleCommentReactionAction({
          commentId: comment.id,
          emoji,
          idempotencyKey: crypto.randomUUID(),
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        await refresh();
      } catch {
        toast.error("The reaction could not be saved. Try again.");
      }
    });

  return {
    body,
    comments,
    pending,
    react,
    refresh,
    remove,
    setBody,
    setComments,
    setVisibility,
    submit,
    visibility,
  };
};
