/* eslint-disable shadcn/no-unknown-classes -- Portal pages reuse the workspace stylesheet classes. */

import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import {
  SkeletonKeep,
  SkelterSurface,
} from "@/components/workspace/skelter-surface";
import { PortalTime } from "@/features/portal/components/portal-time";
import {
  progressPercent,
  progressText,
  projectStatusText,
  projectStatusTone,
  taskStatusText,
  taskStatusTone,
} from "@/features/portal/portal-project-format";
import { getPortalSharedProjectRecord } from "@/features/portal/portal-queries";

// Read only: a client sees progress, upcoming milestones and the tasks the
// team chose to show, and nothing else about the project.
const PortalProjectView = async ({
  projectId,
}: {
  readonly projectId: string;
}) => {
  const project = await getPortalSharedProjectRecord(projectId);
  return (
    <div className="portal-detail">
      <Link
        className="portal-back"
        href="/portal/projects"
        transitionTypes={["nav-back"]}
      >
        <ArrowLeft aria-hidden="true" size={14} />
        All projects
      </Link>
      <header className="portal-bug-head">
        <span className="portal-bug-top">
          <span className="portal-bug-key">{project.key}</span>
          <span className={`badge ${projectStatusTone[project.status]}`}>
            <span aria-hidden="true" className="dot" />
            {projectStatusText[project.status]}
          </span>
        </span>
        <h1>{project.name}</h1>
        {project.description ? (
          <p className="portal-prose">{project.description}</p>
        ) : null}
        {project.dueDate ? (
          <p className="faint">
            Due <PortalTime iso={project.dueDate} variant="date" />
          </p>
        ) : null}
      </header>
      <section
        aria-labelledby="portal-progress-h"
        className="panel portal-panel"
      >
        <h2 className="sec" id="portal-progress-h">
          Progress
        </h2>
        <div className="row">
          <span
            aria-hidden="true"
            className="prog"
            style={{ "--p": progressPercent(project.progress) / 100 }}
          >
            <i />
          </span>
          <span>{progressText(project.progress)}</span>
        </div>
      </section>
      <div className="portal-detail-grid">
        <div className="portal-detail-main">
          <section
            aria-labelledby="portal-tasks-h"
            className="panel portal-panel"
          >
            <h2 className="sec" id="portal-tasks-h">
              Tasks
            </h2>
            {project.tasks.length === 0 ? (
              <p className="faint">The team has not shared any tasks yet.</p>
            ) : (
              <ul aria-label="Shared tasks" className="portal-project-tasks">
                {project.tasks.map((task) => (
                  <li className="portal-project-task" key={task.id}>
                    <strong className="portal-project-task-title">
                      {task.title}
                    </strong>
                    <span
                      className={`badge portal-project-task-status ${taskStatusTone[task.status]}`}
                    >
                      <span aria-hidden="true" className="dot" />
                      {taskStatusText[task.status]}
                    </span>
                    {task.dueDate ? (
                      <span className="faint portal-project-task-due">
                        Due <PortalTime iso={task.dueDate} variant="date" />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside aria-label="Milestones" className="portal-detail-side">
          <section className="panel portal-panel">
            <h2 className="sec">Upcoming milestones</h2>
            {project.milestones.length === 0 ? (
              <p className="faint">No upcoming milestones.</p>
            ) : (
              <ol className="portal-timeline">
                {project.milestones.map((milestone) => (
                  <li key={milestone.id}>
                    <strong>{milestone.name}</strong>
                    {milestone.dueDate ? (
                      <span className="faint">
                        <PortalTime iso={milestone.dueDate} variant="date" />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

const PortalProjectViewSkeleton = () => (
  <SkelterSurface label="Loading project">
    <div className="portal-detail">
      <span className="portal-back">
        <SkeletonKeep>All projects</SkeletonKeep>
      </span>
      <header className="portal-bug-head">
        <span className="portal-bug-top">
          <SkeletonBone shape="short" />
          <SkeletonBone shape="short" />
        </span>
        <h1>
          <SkeletonBone />
        </h1>
        <SkeletonBone />
        <SkeletonBone shape="short" />
      </header>
      <section className="panel portal-panel">
        <SkeletonKeep>
          <h2 className="sec">Progress</h2>
        </SkeletonKeep>
        <div className="row">
          <SkeletonBone />
        </div>
      </section>
      <div className="portal-detail-grid">
        <div className="portal-detail-main">
          <section className="panel portal-panel">
            <SkeletonKeep>
              <h2 className="sec">Tasks</h2>
            </SkeletonKeep>
            <ul className="portal-project-tasks">
              {SKELETON_KEYS.slice(0, 3).map((key) => (
                <li className="portal-project-task" key={key}>
                  <SkeletonBone />
                  <SkeletonBone shape="short" />
                  <SkeletonBone shape="short" />
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="portal-detail-side">
          <section className="panel portal-panel">
            <SkeletonKeep>
              <h2 className="sec">Upcoming milestones</h2>
            </SkeletonKeep>
            <ol className="portal-timeline">
              {SKELETON_KEYS.slice(0, 2).map((key) => (
                <li key={key}>
                  <SkeletonBone />
                  <SkeletonBone shape="short" />
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  </SkelterSurface>
);

export { PortalProjectView, PortalProjectViewSkeleton };
