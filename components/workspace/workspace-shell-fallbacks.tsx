"use client";

/* eslint-disable shadcn/no-unknown-classes */

/* eslint-disable shadcn/no-restyle */

import { List } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

const SIDEBAR_FALLBACK_GROUPS: readonly {
  readonly key: string;
  readonly label?: true;
  readonly rows: readonly string[];
}[] = [
  { key: "personal", rows: ["p1", "p2", "p3", "p4", "p5", "p6"] },
  {
    key: "workspace",
    label: true,
    rows: [
      "w1",
      "w2",
      "w3",
      "w4",
      "w5",
      "w6",
      "w7",
      "w8",
      "w9",
      "w10",
      "w11",
      "w12",
    ],
  },
  { key: "projects", label: true, rows: ["r1", "r2", "r3"] },
] as const;

// Mirrors the sidebar while the session and navigation data load.
export const WorkspaceSidebarFallback = () => (
  <section
    aria-label="Loading workspace navigation"
    aria-live="polite"
    className="workspace-loading-sidebar"
  >
    <div aria-hidden="true" className="side-top workspace-loading-side-top">
      <div className="ws workspace-loading-brand-row">
        <span className="sk workspace-loading-logo" />
        <span className="sk workspace-loading-brand" />
      </div>
      <span className="workspace-loading-collapse" />
    </div>
    <div
      aria-hidden="true"
      className="side-scroll workspace-loading-side-scroll"
    >
      {SIDEBAR_FALLBACK_GROUPS.map(({ key, label, rows }) => (
        <div className="sgroup workspace-loading-group" key={key}>
          {label ? (
            <div className="sgroup-h">
              <span className="sk workspace-loading-group-label" />
            </div>
          ) : null}
          {rows.map((row) => (
            <div className="sitem workspace-loading-item" key={row}>
              <span className="sk workspace-loading-icon" />
              <span className="sk workspace-loading-label" />
            </div>
          ))}
        </div>
      ))}
    </div>
    <div aria-hidden="true" className="side-bot workspace-loading-side-bot">
      <div className="sitem workspace-loading-item">
        <span className="sk workspace-loading-icon" />
        <span className="sk workspace-loading-label workspace-loading-settings" />
      </div>
      <div className="workspace-loading-account">
        <span className="sk workspace-loading-avatar" />
        <span className="sk workspace-loading-account-name" />
      </div>
    </div>
  </section>
);

const TOPBAR_FALLBACK_KEYS = ["t1", "t2", "t3"] as const;
const BOTTOM_FALLBACK_KEYS = ["b1", "b2", "b3", "b4", "b5"] as const;

// Holds the title's place until the URL is read on a dynamic route.
export const WorkspaceTopbarTitleFallback = () => (
  <span aria-hidden="true" className="workspace-loading-title" />
);

// Holds the phone menu button's place while the session data loads.
export const WorkspaceTopbarMenuFallback = () => (
  <Button
    aria-hidden="true"
    data-workspace-mobile-menu=""
    disabled
    size="icon-sm"
    tabIndex={-1}
    variant="ghost"
  >
    <List aria-hidden="true" size={18} />
  </Button>
);

// Mirrors the action buttons while the session data loads.
export const WorkspaceTopbarActionsFallback = () =>
  TOPBAR_FALLBACK_KEYS.map((key) => (
    <span aria-hidden="true" className="workspace-loading-action" key={key} />
  ));

// Mirrors the phone bottom navigation while the session data loads.
export const WorkspaceBottomChromeFallback = () => (
  <div aria-hidden="true" className="bottomnav">
    {BOTTOM_FALLBACK_KEYS.map((key) => (
      <span className="workspace-loading-tab" key={key} />
    ))}
  </div>
);
