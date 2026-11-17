/* eslint-disable shadcn/no-unknown-classes -- Board layout uses apps/web/app/workspace-styles. */

"use client";

import { Bug } from "@phosphor-icons/react";

import { EmptyState } from "@/components/workspace/empty-state";
import { BUG_BOARD_COLUMNS } from "@/features/bugs/components/bug-board-columns";
import { BugCard } from "@/features/bugs/components/bug-list";
import type { BugListItemSchema } from "@/src/server/work/bug-management";

type BugItem = typeof BugListItemSchema.Type;

export const BugBoard = ({ bugs }: { readonly bugs: readonly BugItem[] }) => (
  <div aria-label="Bug workflow board" className="bug-board">
    {BUG_BOARD_COLUMNS.map((column) => {
      const states = new Set<string>(column.states);
      const items = bugs.filter((bugEntry) => states.has(bugEntry.bug.status));
      return (
        <section
          aria-labelledby={`bug-column-${column.id}`}
          className="bug-board-column"
          key={column.id}
        >
          <header className="bug-board-column-header">
            <h2 id={`bug-column-${column.id}`}>{column.label}</h2>
            <span aria-label={`${items.length} bugs`}>{items.length}</span>
          </header>
          <div className="bug-board-cards">
            {items.length ? (
              items.map((bugEntry) => (
                <BugCard bugEntry={bugEntry} key={bugEntry.bug.id} />
              ))
            ) : (
              <EmptyState
                icon={Bug}
                size="compact"
                title="No bugs in this stage"
              />
            )}
          </div>
        </section>
      );
    })}
  </div>
);
