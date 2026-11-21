/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles -- Project details use reference workspace styles. */

import {
  Bug,
  CalendarBlank,
  CaretDown,
  ChartLineUp,
  Clock,
  Files,
  Pulse,
  SealCheck,
  SquaresFour,
  Table,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { ViewSwitchTransition } from "@/components/ui/view-switch-transition";
import { ErrorToast } from "@/components/workspace/error-toast";
import {
  SKELETON_KEYS,
  SkeletonBone,
  SkeletonRows,
} from "@/components/workspace/skeleton-shapes";
import {
  SkeletonKeep,
  SkelterSurface,
} from "@/components/workspace/skelter-surface";
import { CalendarGridSkeleton } from "@/features/calendar/components/calendar-view";
import { FavoriteToggle } from "@/features/discovery/components/favorite-toggle";
import { ProjectAdminControls } from "@/features/projects/components/project-admin-controls";
import { ProjectClientVisibility } from "@/features/projects/components/project-client-visibility";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import { ProjectMemberAvatars } from "@/features/projects/components/project-list-layouts";
import { ProjectTimelineSkeleton } from "@/features/projects/components/project-timeline";
import { ProjectViewContent } from "@/features/projects/components/project-view-content";
import { ProjectViewTabs } from "@/features/projects/components/project-view-tabs";
import { SearchParamFallback } from "@/features/projects/components/search-param-fallback";
import {
  getProjectBodyData,
  getProjectHeaderData,
} from "@/features/projects/project-detail-data";
import type { ProjectDetailQuery } from "@/features/projects/project-detail-data";
import { ProjectViewStoreProvider } from "@/features/projects/providers/project-view-store-provider";
import { TaskDrawerHost } from "@/features/tasks/components/task-drawer-host";

const ProjectHeader = async ({
  projectId,
  requestedView,
}: {
  readonly projectId: string;
  readonly requestedView: string;
}) => {
  const {
    employees,
    isAdmin,
    isFavorite,
    personalError,
    project,
    teams,
    view,
  } = await getProjectHeaderData(projectId, requestedView);
  const membersById = new Map(
    employees.map((employee) => [employee.id, employee] as const)
  );
  return (
    <div className="proj-h">
      <ErrorToast message={personalError} />
      <div className="row">
        <ProjectIcon color={project.color} icon={project.icon} />
        <span className="faint">Projects</span>
        <span className="sep">/</span>
        <h1>{project.name}</h1>
        <FavoriteToggle
          id={project.id}
          initialFavorite={isFavorite}
          kind="project"
        />
      </div>
      <p>{project.description || "Project workspace"}</p>
      <div className="row project-meta">
        <span className={`pstatus ${project.status}`}>{project.status}</span>
        <span className="muted">
          {project.startDate ?? "No start date"} —{" "}
          {project.dueDate ?? "No due date"}
        </span>
        {project.memberIds.length > 0 ? (
          <ProjectMemberAvatars
            memberIds={project.memberIds}
            membersById={membersById}
          />
        ) : null}
        {isAdmin ? (
          <>
            <ProjectAdminControls
              employees={employees}
              project={project}
              teams={teams}
            />
            <ProjectClientVisibility
              clientVisible={project.clientVisible}
              projectId={project.id}
              version={project.version}
            />
          </>
        ) : null}
      </div>
      <ProjectViewTabs
        isAdmin={isAdmin}
        projectId={project.id}
        selected={view}
      />
    </div>
  );
};

const ProjectBody = async ({
  initialTaskId,
  projectId,
  query,
}: {
  readonly initialTaskId: string | null;
  readonly projectId: string;
  readonly query: ProjectDetailQuery;
}) => {
  const {
    activityResult,
    automationResult,
    bugResult,
    calendarEvents,
    calendarMode,
    calendarRange,
    currentUserId,
    customFieldError,
    customFieldTable,
    editableTaskIds,
    employeeResult,
    fileResult,
    initialColumnWidths,
    isAdmin,
    labelResult,
    milestonePanel,
    milestones,
    milestonesVersion,
    monthOffset,
    project,
    preferencesError,
    runResult,
    taskResult,
    tasks,
    teamResult,
    timelineRange,
    today,
    view,
  } = await getProjectBodyData(projectId, query);
  const employees = employeeResult.ok ? employeeResult.data : [];
  return (
    <ProjectViewStoreProvider initialColumnWidths={initialColumnWidths}>
      <TaskDrawerHost
        currentUserId={currentUserId}
        editableTaskIds={[...editableTaskIds]}
        employees={employees}
        initialTaskId={initialTaskId}
        isAdmin={isAdmin}
        tasks={tasks}
      >
        <ErrorToast message={customFieldError} />
        <ErrorToast message={preferencesError} />
        <ErrorToast
          message={employeeResult.ok ? null : employeeResult.error.message}
        />
        <ErrorToast message={teamResult.ok ? null : teamResult.error.message} />
        <ErrorToast
          message={labelResult.ok ? null : labelResult.error.message}
        />
        <ViewSwitchTransition name="project-view" view={view}>
          <ProjectViewContent
            activityResult={activityResult}
            automationResult={automationResult}
            bugResult={bugResult}
            calendarEvents={calendarEvents}
            calendarMode={calendarMode}
            calendarRange={calendarRange}
            currentUserId={currentUserId}
            customFieldTable={customFieldTable}
            editableTaskIds={editableTaskIds}
            employees={employees}
            fileResult={fileResult}
            isAdmin={isAdmin}
            labelResult={labelResult}
            milestonePanel={milestonePanel}
            milestones={milestones}
            milestonesVersion={milestonesVersion}
            monthOffset={monthOffset}
            project={project}
            runResult={runResult}
            taskResult={taskResult}
            tasks={tasks}
            teams={teamResult.ok ? teamResult.data : []}
            timelineRange={timelineRange}
            today={today}
            view={view}
          />
        </ViewSwitchTransition>
      </TaskDrawerHost>
    </ProjectViewStoreProvider>
  );
};

const VIEWS = [
  { Icon: SquaresFour, id: "overview", label: "Overview" },
  { Icon: SquaresFour, id: "board", label: "Board" },
  { Icon: Table, id: "table", label: "Table" },
  { Icon: Bug, id: "bugs", label: "Bugs" },
  { Icon: CalendarBlank, id: "calendar", label: "Calendar" },
  { Icon: ChartLineUp, id: "timeline", label: "Timeline" },
  { Icon: Files, id: "files", label: "Files" },
  { Icon: Pulse, id: "activity", label: "Activity" },
  { Icon: SealCheck, id: "approvals", label: "Approvals" },
  { Icon: Clock, id: "time", label: "Time" },
] as const;

const COLUMNS = ["Backlog", "To Do", "In Progress", "Review", "Done"] as const;
const COLUMN_CARDS = SKELETON_KEYS.slice(0, 3);
const STATS = SKELETON_KEYS.slice(0, 4);
const UPCOMING = SKELETON_KEYS.slice(0, 3);
const DETAIL_ROWS = SKELETON_KEYS.slice(0, 5);
const STATUS_ROWS = SKELETON_KEYS.slice(0, 5);

// The crumb and view tabs are static; the project name, description and meta
// are data. Admin-only controls are not reserved: most people never get them.
const ProjectHeaderSkeleton = ({ view }: { readonly view: string }) => (
  <SkelterSurface label="Loading project…">
    <div className="proj-h">
      <div className="row">
        <SkeletonBone shape="avatar" />
        <span className="faint">
          <SkeletonKeep>Projects</SkeletonKeep>
        </span>
        <span className="sep">/</span>
        <h1>
          <SkeletonBone shape="title" />
        </h1>
      </div>
      <p>
        <SkeletonBone />
      </p>
      <div className="row project-meta">
        <SkeletonBone shape="short" />
        <SkeletonBone shape="short" />
      </div>
      <SkeletonKeep>
        <nav aria-label="Project views" className="tabs project-tabs">
          {VIEWS.map(({ Icon, id, label }) => (
            <span className={`tab${id === view ? " on" : ""}`} key={id}>
              <Icon aria-hidden="true" size={14} />
              {label}
            </span>
          ))}
        </nav>
      </SkeletonKeep>
    </div>
  </SkelterSurface>
);

const BoardBodySkeleton = () => (
  <div className="project-board-wrap">
    <SkelterSurface label="Loading board…">
      <SkeletonKeep>
        <div className="board-toolbar">
          <span className="skeleton-filter-select skeleton-search board-search">
            Search tasks...
          </span>
          <span className="skeleton-filter-select">
            All priorities
            <CaretDown aria-hidden="true" size={14} />
          </span>
          <span className="skeleton-filter-select">
            Manual order
            <CaretDown aria-hidden="true" size={14} />
          </span>
          <div className="board-toolbar-action">
            <span className="btn btn-primary btn-sm w-fit">New task</span>
          </div>
        </div>
      </SkeletonKeep>
      <div className="board">
        {COLUMNS.map((column) => (
          <section className="bcol" key={column}>
            <header className="bcol-h">
              <span aria-hidden="true" className="st" />
              <SkeletonKeep>{column}</SkeletonKeep>
            </header>
            <div className="bcol-b">
              {COLUMN_CARDS.map((key) => (
                <div className="kcard" key={key}>
                  <div className="top">
                    <SkeletonBone shape="short" />
                    <SkeletonBone />
                  </div>
                  <div className="meta">
                    <SkeletonBone shape="short" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </SkelterSurface>
  </div>
);

const PanelHeading = ({ title }: { readonly title: string }) => (
  <div className="panel-h">
    <h2>
      <SkeletonKeep>{title}</SkeletonKeep>
    </h2>
  </div>
);

// Mirrors ProjectOverview with its real wrappers: stat strip, main panels and
// the details aside. Headings are static; numbers and rows are data.
const OverviewBodySkeleton = () => (
  <SkelterSurface label="Loading overview…">
    <div className="project-overview">
      <div className="stats po-stats">
        {STATS.map((key) => (
          <div className="stat" key={key}>
            <span className="k">
              <SkeletonBone shape="short" />
            </span>
            <span className="v">
              <SkeletonBone shape="title" />
            </span>
            <span className="d">
              <SkeletonBone shape="short" />
            </span>
          </div>
        ))}
      </div>
      <div className="project-overview-main">
        <section className="panel">
          <PanelHeading title="Coming up" />
          <ul className="project-upcoming-list">
            {UPCOMING.map((key) => (
              <li className="project-upcoming-item" key={key}>
                <SkeletonBone />
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <PanelHeading title="Tasks by status" />
          <ul className="project-status-breakdown">
            {STATUS_ROWS.map((key) => (
              <li key={key}>
                <SkeletonBone />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <aside className="project-overview-aside">
        <section className="panel">
          <PanelHeading title="Details" />
          <dl className="project-overview-details">
            {DETAIL_ROWS.map((key) => (
              <div key={key}>
                <dt>
                  <SkeletonBone shape="short" />
                </dt>
                <dd>
                  <SkeletonBone shape="short" />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  </SkelterSurface>
);

const ROW_BODY_ROWS = { activity: 5, bugs: 5, files: 3, table: 5 } as const;

const rowCount = (view: string) =>
  Object.entries(ROW_BODY_ROWS).find(([name]) => name === view)?.[1] ?? 3;

const bodyFor = (view: string): ReactNode => {
  if (view === "board") {
    return <BoardBodySkeleton />;
  }
  if (view === "overview") {
    return <OverviewBodySkeleton />;
  }
  if (view === "calendar") {
    return <CalendarGridSkeleton mode="month" />;
  }
  if (view === "timeline") {
    return <ProjectTimelineSkeleton />;
  }
  return (
    <SkelterSurface label="Loading project…">
      <section className="panel">
        <div className="panel-b">
          <SkeletonRows rows={rowCount(view)} />
        </div>
      </section>
    </SkelterSurface>
  );
};

const ProjectBodySkeleton = ({ view }: { readonly view: string }) =>
  bodyFor(view);

const PROJECT_VIEW_IDS = [...VIEWS.map(({ id }) => id), "list"] as const;

// One pre-rendered skeleton per ?view value; SearchParamFallback picks the one
// the URL asks for, and the board when there is none.
const ProjectSkeletonFallback = ({
  part,
}: {
  readonly part: "body" | "header";
}) => (
  <SearchParamFallback
    cases={Object.fromEntries(
      PROJECT_VIEW_IDS.map((view) => [
        view,
        part === "header" ? (
          <ProjectHeaderSkeleton key={view} view={view} />
        ) : (
          <ProjectBodySkeleton key={view} view={view} />
        ),
      ])
    )}
    fallback={
      part === "header" ? (
        <ProjectHeaderSkeleton view="board" />
      ) : (
        <ProjectBodySkeleton view="board" />
      )
    }
    name="view"
  />
);

export { ProjectBody, ProjectHeader, ProjectSkeletonFallback };
