/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */

import Link from "next/link";

import { ViewSwitchTransition } from "@/components/ui/view-switch-transition";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import {
  OpenTasksIcon,
  ViewAllTasksIcon,
} from "@/features/dashboard/components/home-action-icons";
import { formatDueDate } from "@/features/dashboard/home-dates";
import { HOME_TASK_VIEWS } from "@/features/dashboard/home-task-view";
import type { HomeTaskView } from "@/features/dashboard/home-task-view";
import { TaskCompletionCheckbox } from "@/features/tasks/components/task-completion-checkbox";
import type { ProjectTaskListItem } from "@/src/server/work/work-contracts";

export {
  HomeStats,
  HomeStatsSkeleton,
} from "@/features/dashboard/components/home-stats";
export {
  RecentActivityPanel,
  RecentActivityPanelSkeleton,
} from "@/features/dashboard/components/home-activity-panel";
export {
  ProjectProgressPanel,
  ProjectProgressPanelSkeleton,
} from "@/features/dashboard/components/home-progress-panel";

export interface HomeTask extends Pick<
  ProjectTaskListItem,
  | "dueDate"
  | "id"
  | "projectId"
  | "projectTaskNumber"
  | "status"
  | "title"
  | "version"
> {
  readonly projectName: string;
  readonly projectKey: string;
  readonly projectColor: string;
}

export interface TaskViewLists {
  readonly upcoming: readonly HomeTask[];
  readonly overdue: readonly HomeTask[];
  readonly completed: readonly HomeTask[];
}

export const MyTasksPanel = ({
  taskView,
  taskViews,
}: {
  readonly taskView: keyof TaskViewLists;
  readonly taskViews: TaskViewLists;
}) => {
  const visible = taskViews[taskView].slice(0, 7);
  return (
    <section className="panel">
      <div className="panel-h home-tasks-header">
        <h2>My tasks</h2>
        <div className="acts">
          <nav aria-label="My task status" className="seg">
            {HOME_TASK_VIEWS.map((tab) => (
              <Link
                aria-current={taskView === tab ? "page" : undefined}
                className={taskView === tab ? "on" : ""}
                href={`/?taskView=${tab}`}
                key={tab}
              >
                {tab[0]?.toUpperCase()}
                {tab.slice(1)}{" "}
                <span className="faint">{taskViews[tab].length}</span>
              </Link>
            ))}
          </nav>
          <Link
            aria-label="Open all my tasks"
            className="ibtn ibtn-sm"
            href="/my-tasks"
          >
            <OpenTasksIcon />
          </Link>
        </div>
      </div>
      <ViewSwitchTransition name="home-task-view" view={taskView}>
        {visible.length ? (
          visible.map((task) => (
            <article className="mini home-task-row" key={task.id}>
              <TaskCompletionCheckbox
                status={task.status}
                taskId={task.id}
                title={task.title}
                version={task.version}
              />
              <Link
                className="trunc grow"
                href={`/projects/${task.projectId}?view=board`}
              >
                {task.title}
              </Link>
              <span className="muted">{task.projectName}</span>
              <span className="num">{formatDueDate(task.dueDate)}</span>
            </article>
          ))
        ) : (
          <div className="panel-b muted">
            {taskView === "overdue"
              ? "Nothing overdue. Every task assigned to you is on schedule."
              : "No tasks here. Tasks assigned to you appear here."}
          </div>
        )}
      </ViewSwitchTransition>
      {taskViews[taskView].length > 7 ? (
        <Link className="addrow" href="/my-tasks">
          View all {taskViews[taskView].length} tasks
          <ViewAllTasksIcon />
        </Link>
      ) : null}
    </section>
  );
};

const TASK_VIEW_LABELS = {
  completed: "Completed",
  overdue: "Overdue",
  upcoming: "Upcoming",
} as const satisfies Record<HomeTaskView, string>;

// Mirrors MyTasksPanel: the header and tab labels are static, the counts and
// rows are data.
export const MyTasksPanelSkeleton = ({
  taskView,
}: {
  readonly taskView: HomeTaskView;
}) => (
  <section className="panel">
    <div className="panel-h home-tasks-header">
      <h2>My tasks</h2>
      <div aria-hidden="true" className="acts" inert>
        <span className="seg">
          {HOME_TASK_VIEWS.map((tab) => (
            <button
              className={taskView === tab ? "on" : ""}
              key={tab}
              tabIndex={-1}
              type="button"
            >
              {TASK_VIEW_LABELS[tab]}{" "}
              <span className="faint">
                <SkeletonBone shape="line" width="1ch" />
              </span>
            </button>
          ))}
        </span>
        <span className="ibtn ibtn-sm">
          <OpenTasksIcon />
        </span>
      </div>
    </div>
    <SkeletonRegion label="Loading your tasks…">
      {SKELETON_KEYS.slice(0, 3).map((key) => (
        <div className="mini home-task-row" key={key}>
          <span className="home-task-completion">
            <SkeletonBone shape="line" width="16px" />
          </span>
          <span className="trunc grow">
            <SkeletonBone shape="line" width="60%" />
          </span>
          <span className="muted">
            <SkeletonBone shape="line" width="7em" />
          </span>
          <span className="num">
            <SkeletonBone shape="line" width="3.5em" />
          </span>
        </div>
      ))}
    </SkeletonRegion>
  </section>
);

export const UpcomingDeadlinesPanel = ({
  groups,
}: {
  readonly groups: readonly {
    readonly name: string;
    readonly tasks: readonly HomeTask[];
  }[];
}) => (
  <section className="panel">
    <div className="panel-h">
      <h2>Upcoming deadlines</h2>
      <Link className="btn btn-sm btn-ghost" href="/calendar">
        Calendar
      </Link>
    </div>
    <div className="panel-b stack">
      {groups.map((group) => (
        <div className="deadline-group" key={group.name}>
          <div className="row">
            <strong>{group.name}</strong>
            <span className="faint">{group.tasks.length}</span>
          </div>
          {group.tasks.slice(0, 4).map((task) => (
            <Link
              className="row deadline-row"
              href={`/projects/${task.projectId}?view=board`}
              key={task.id}
            >
              <span
                aria-hidden="true"
                className="pdot"
                style={{ "--c": task.projectColor }}
              />
              <span className="trunc grow">{task.title}</span>
              <span className="muted">
                {task.projectKey}-{task.projectTaskNumber}
              </span>
            </Link>
          ))}
          {group.tasks.length === 0 ? (
            <span className="faint">Nothing due</span>
          ) : null}
          {group.tasks.length > 4 ? (
            <Link className="faint" href="/calendar">
              +{group.tasks.length - 4} more
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  </section>
);

const DEADLINE_GROUPS = ["Today", "Tomorrow", "This week"] as const;

// Mirrors UpcomingDeadlinesPanel with one line per group, the height of the
// common "Nothing due" group.
export const UpcomingDeadlinesPanelSkeleton = () => (
  <section className="panel">
    <div className="panel-h">
      <h2>Upcoming deadlines</h2>
      <span aria-hidden="true" className="btn btn-sm btn-ghost">
        Calendar
      </span>
    </div>
    <SkeletonRegion label="Loading deadlines…">
      <div className="panel-b stack">
        {DEADLINE_GROUPS.map((name) => (
          <div className="deadline-group" key={name}>
            <div className="row">
              <strong>{name}</strong>
              <span className="faint">
                <SkeletonBone shape="line" width="1ch" />
              </span>
            </div>
            <span className="faint">
              <SkeletonBone shape="line" width="6em" />
            </span>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  </section>
);
