import type { DragEvent } from "react";

// Kanban drag highlights live on the DOM, outside React, so a re-render in the
// middle of a drag can neither cancel it nor drop the highlight.

// The column body handles the drag; its `.bcol` parent shows the drop target.
export const markDropColumn = (event: DragEvent<HTMLElement>) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.parentElement?.classList.add("is-over");
};

// Moving onto a card inside the column is not leaving it.
export const unmarkDropColumn = (event: DragEvent<HTMLElement>) => {
  const { relatedTarget } = event;
  if (
    relatedTarget instanceof Node &&
    event.currentTarget.contains(relatedTarget)
  ) {
    return;
  }
  event.currentTarget.parentElement?.classList.remove("is-over");
};

export const markDragSource = (
  event: DragEvent<HTMLElement>,
  taskId: string
) => {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", taskId);
  const card = event.currentTarget;
  // After the browser has taken its drag image, so the image stays solid.
  window.setTimeout(() => card.classList.add("is-dragging"), 0);
};

// A dropped card may remount in its new column, so clear by query, not by node.
export const clearBoardDragState = () => {
  for (const element of document.querySelectorAll(
    ".kcard.is-dragging, .bcol.is-over"
  )) {
    element.classList.remove("is-dragging", "is-over");
  }
};
