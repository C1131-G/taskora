/* eslint-disable shadcn/no-unknown-classes */

"use client";

export type TaskDrawerTab =
  | "client"
  | "comments"
  | "details"
  | "files"
  | "subtasks"
  | "time";

const TABS: readonly { readonly id: TaskDrawerTab; readonly label: string }[] =
  [
    { id: "details", label: "Details" },
    { id: "subtasks", label: "Subtasks" },
    { id: "time", label: "Time" },
    { id: "comments", label: "Comments" },
    { id: "files", label: "Files" },
    { id: "client", label: "Client" },
  ];

// One short view at a time instead of a single very long scroll. Counts show
// where there is something to read before the tab is opened.
export const TaskDrawerTabs = ({
  active,
  counts,
  onChange,
}: {
  readonly active: TaskDrawerTab;
  readonly counts: Readonly<Partial<Record<TaskDrawerTab, number>>>;
  readonly onChange: (tab: TaskDrawerTab) => void;
}) => (
  <div aria-label="Task sections" className="drawer-tabs" role="tablist">
    {TABS.map(({ id, label }) => {
      const count = counts[id];
      return (
        <button
          aria-selected={active === id}
          className="drawer-tab"
          id={`drawer-tab-${id}`}
          key={id}
          onClick={() => onChange(id)}
          role="tab"
          type="button"
        >
          {label}
          {count ? <span className="drawer-tab-count">{count}</span> : null}
        </button>
      );
    })}
  </div>
);
