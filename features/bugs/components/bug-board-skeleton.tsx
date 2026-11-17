/* eslint-disable shadcn/no-unknown-classes -- Board layout uses apps/web/app/workspace-styles. */

import type { ReactNode } from "react";

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import { BUG_BOARD_COLUMNS } from "@/features/bugs/components/bug-board-columns";

// The board's real columns with two placeholder cards each; the counts are data.
export const BugBoardSkeleton = ({ card }: { readonly card: ReactNode }) => (
  <output
    aria-busy="true"
    aria-label="Loading bug board…"
    className="bug-board"
  >
    <span className="sr-only">Loading bug board…</span>
    {BUG_BOARD_COLUMNS.map((column) => (
      <section aria-hidden="true" className="bug-board-column" key={column.id}>
        <header className="bug-board-column-header">
          <h2>{column.label}</h2>
          <span>
            <SkeletonBone shape="short" />
          </span>
        </header>
        <div className="bug-board-cards">
          {card}
          {card}
        </div>
      </section>
    ))}
  </output>
);
