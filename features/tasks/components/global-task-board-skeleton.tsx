"use client";

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, shadcn/no-unknown-classes */

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import { TASK_STATUSES } from "@/src/mobile-api/task-statuses";

const SKELETON_CARDS = ["a", "b", "c"] as const;

// The board frame with its real columns and headers; each column shows a few
// cards whose text lines are bones. Counts are data, so they are bones too.
export const GlobalTaskBoardSkeleton = () => (
  <output
    aria-busy="true"
    aria-label="Loading tasks…"
    className="project-board-wrap global-task-board-wrap gt-board-skeleton"
  >
    <span className="sr-only">Loading tasks…</span>
    <div aria-hidden="true" className="board global-task-board">
      {TASK_STATUSES.map((status) => (
        <section className="bcol" key={status.id}>
          <header className="bcol-h">
            <span className={`st ${status.id}`} />
            <span>{status.label}</span>
            <span className="cnt">
              <SkeletonBone shape="short" />
            </span>
          </header>
          <div className="bcol-b">
            {SKELETON_CARDS.map((card) => (
              <article className="kcard gt-card" key={card}>
                <div className="gt-card-top">
                  <SkeletonBone shape="short" />
                </div>
                <h3 className="title gt-card-title">
                  <SkeletonBone />
                </h3>
                <p className="gt-card-project">
                  <SkeletonBone shape="short" />
                </p>
                <div className="gt-card-meta">
                  <SkeletonBone shape="short" />
                  <span className="sp" />
                  <SkeletonBone shape="avatar" />
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  </output>
);
