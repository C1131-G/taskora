/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

/* eslint-disable shadcn/require-static-classes */

"use client";

import { Star } from "@phosphor-icons/react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import {
  toggleProjectFavoriteAction,
  toggleTaskFavoriteAction,
} from "@/features/discovery/discovery-actions";

const FavoriteToggle = ({
  kind,
  id,
  initialFavorite,
}: {
  readonly kind: "project" | "task";
  readonly id: string;
  readonly initialFavorite: boolean;
}) => {
  const [favorite, setFavorite] = useOptimistic(initialFavorite);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    if (pending) {
      return;
    }
    startTransition(async () => {
      setFavorite(!favorite);
      try {
        const result =
          kind === "project"
            ? await toggleProjectFavoriteAction({
                idempotencyKey: crypto.randomUUID(),
                projectId: id,
              })
            : await toggleTaskFavoriteAction({
                idempotencyKey: crypto.randomUUID(),
                taskId: id,
              });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        setFavorite(result.data);
      } catch {
        toast.error("Favorites could not be updated. Try again.");
      }
    });
  };

  return (
    <span className="col">
      <WorkspaceButton
        aria-pressed={favorite}
        aria-label={`${favorite ? "Remove from" : "Add to"} favorites`}
        className={`ibtn ibtn-sm${favorite ? " on" : ""}`}
        disabled={pending}
        onClick={toggle}
        type="button"
      >
        <Star
          aria-hidden="true"
          size={14}
          weight={favorite ? "fill" : "regular"}
        />
      </WorkspaceButton>
    </span>
  );
};

export { FavoriteToggle };
