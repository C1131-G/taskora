/* eslint-disable shadcn/no-restyle, shadcn/no-unknown-classes -- Bug screens use reference workspace styles from apps/web/app/workspace-styles. */

import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { BUG_STATUS_FILTERS } from "@/features/bugs/bug-filters";
import type { BugFilters } from "@/features/bugs/bug-filters";
import { BugBoardSkeleton } from "@/features/bugs/components/bug-board-skeleton";

// Kept apart from bug-tracker.tsx: the URL-driven fallback is a client
// component and must not pull the tracker's server queries into the bundle.

// The search row, status pills and view switch. They depend only on the URL,
// so the loading state renders the same controls (inert) at their real size.
const BugTrackerControls = ({ filters }: { readonly filters: BugFilters }) => {
  const isQueue = filters.view === "client_queue";
  return (
    <>
      <search>
        <form action="/bugs" className="bug-filter-form">
          <label className="sr-only" htmlFor="bug-search">
            Search bugs and fix history
          </label>
          <Input
            autoComplete="off"
            className="bug-search"
            defaultValue={filters.query}
            id="bug-search"
            name="q"
            placeholder="Search reports, components, and past fixes"
            type="search"
          />
          <Button type="submit">Search</Button>
          <Link
            className="btn btn-ghost"
            href={filters.archived ? "/bugs" : "/bugs?archived=true"}
          >
            {filters.archived ? "Active bugs" : "Include archived"}
          </Link>
        </form>
      </search>
      {isQueue ? null : (
        <nav aria-label="Filter bugs by status" className="bug-status-filters">
          {BUG_STATUS_FILTERS.map(([value, label]) => {
            const query = new URLSearchParams();
            if (value) {
              query.set("status", value);
            }
            if (filters.query) {
              query.set("q", filters.query);
            }
            if (filters.archived) {
              query.set("archived", "true");
            }
            return (
              <Link
                aria-current={filters.status === value ? "page" : undefined}
                className={`bug-status-filter${filters.status === value ? " selected" : ""}`}
                href={query.size ? `/bugs?${query.toString()}` : "/bugs"}
                key={value || "all"}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
      <nav aria-label="Bug display" className="bug-view-switch">
        <Link
          aria-current={filters.view === "list" ? "page" : undefined}
          href="/bugs"
          className={filters.view === "list" ? "selected" : ""}
        >
          List
        </Link>
        <Link
          aria-current={filters.view === "board" ? "page" : undefined}
          href="/bugs?view=board"
          className={filters.view === "board" ? "selected" : ""}
        >
          Board
        </Link>
        <Link
          aria-current={isQueue ? "page" : undefined}
          href="/bugs?view=client_queue"
          className={isQueue ? "selected" : ""}
        >
          Client queue
        </Link>
      </nav>
    </>
  );
};

const SKELETON_ROWS = ["a", "b", "c", "d"] as const;

// One bug card with the real card markup: the severity bar, key, title,
// context and meta pills are bones; the arrow and the list's drawer button are
// static. The client queue's per-role action is a bone of the same size.
const BugCardSkeleton = ({ queue = false }: { readonly queue?: boolean }) => (
  <article aria-hidden="true" className="panel panel-b bug-list-item">
    <div className="bug-list-link">
      <span className="bug-severity" />
      <div className="bug-list-main">
        <div className="bug-list-title-row">
          <span className="bug-task-key w-14">
            <SkeletonBone shape="short" />
          </span>
          <h2 className="min-h-lh w-72 max-w-full">
            <SkeletonBone />
          </h2>
        </div>
        <p className="bug-list-context min-h-lh">
          <SkeletonBone />
        </p>
        <div className="bug-list-meta">
          {SKELETON_KEYS.slice(0, 4).map((key) => (
            <span className="min-h-lh" key={key}>
              <SkeletonBone shape="short" />
            </span>
          ))}
        </div>
      </div>
      <ArrowUpRight aria-hidden="true" className="bug-list-arrow" size={16} />
    </div>
    {queue ? (
      <SkeletonBone shape="control" />
    ) : (
      <Button
        className="bug-open-drawer"
        inert
        size="sm"
        type="button"
        variant="outline"
      >
        Open workflow
      </Button>
    )}
  </article>
);

// Mirrors BugTracker for the filters in the URL: the controls are the real ones
// (inert), only the bug cards are placeholders.
const BugTrackerSkeleton = ({ filters }: { readonly filters: BugFilters }) => (
  <>
    <div aria-hidden="true" className="contents" inert>
      <BugTrackerControls filters={filters} />
    </div>
    {filters.view === "board" ? (
      <BugBoardSkeleton card={<BugCardSkeleton />} />
    ) : (
      <output
        aria-busy="true"
        aria-label="Loading bug reports…"
        className="bug-list"
      >
        <span className="sr-only">Loading bug reports…</span>
        {SKELETON_ROWS.map((key) => (
          <BugCardSkeleton key={key} queue={filters.view === "client_queue"} />
        ))}
      </output>
    )}
  </>
);

export { BugTrackerControls, BugTrackerSkeleton };
