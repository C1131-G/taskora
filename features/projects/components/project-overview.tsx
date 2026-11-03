/* eslint-disable shadcn/no-unknown-classes */

import type { ReactNode } from "react";

import {
  ProjectProgress,
  ProjectUpcomingTasks,
} from "@/features/projects/components/project-overview-main-sections";
import {
  ProjectDetails,
  ProjectRecentActivity,
} from "@/features/projects/components/project-overview-side-sections";
import type { ProjectOverviewTask } from "@/features/projects/types/project-overview-contracts";
import type { ActivityEntry } from "@/src/server/activity/activity-management";
import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";
import type { ProjectListItem } from "@/src/server/projects/project-contracts";

const ProjectOverview = ({
  activity,
  activityUnavailable,
  budget,
  currentUserId,
  employees,
  isAdmin,
  milestones,
  project,
  tasks,
  teams,
  today,
}: {
  readonly activity: readonly ActivityEntry[];
  readonly activityUnavailable: boolean;
  readonly budget: ReactNode;
  readonly currentUserId: string | null;
  readonly employees: readonly EmployeeDirectoryEntry[];
  readonly isAdmin: boolean;
  readonly milestones: ReactNode;
  readonly project: ProjectListItem;
  readonly tasks: readonly ProjectOverviewTask[];
  readonly teams: readonly { readonly id: string; readonly name: string }[];
  readonly today: string;
}) => {
  const openTasks = tasks.filter((task) => task.status !== "done");
  const overdueTasks = openTasks.filter(
    (task) => task.dueDate && task.dueDate < today
  ).length;
  const daysLeft = project.dueDate
    ? Math.ceil(
        (Date.parse(`${project.dueDate}T00:00:00Z`) -
          Date.parse(`${today}T00:00:00Z`)) /
          86_400_000
      )
    : null;
  let deadline = "No deadline";
  let deadlineNote = "Set a due date to track time";
  if (daysLeft !== null) {
    deadline = String(Math.abs(daysLeft));
    deadlineNote =
      daysLeft < 0
        ? `days past ${project.dueDate}`
        : `days until ${project.dueDate}`;
  }
  return (
    <div className="project-overview">
      <div className="stats po-stats">
        <div className="stat">
          <span className="k">Progress</span>
          <span className="v">{project.progress}%</span>
          <span className="d">
            {project.completedTaskCount} of {project.taskCount} tasks done
          </span>
        </div>
        <div className="stat">
          <span className="k">Open tasks</span>
          <span className="v">{openTasks.length}</span>
          <span className="d">Still to finish</span>
        </div>
        <div className={`stat po-overdue${overdueTasks > 0 ? " alert" : ""}`}>
          <span className="k">Overdue</span>
          <span className="v">{overdueTasks}</span>
          <span className="d">
            {overdueTasks > 0 ? "Need attention" : "All on track"}
          </span>
        </div>
        <div className="stat">
          <span className="k">Time left</span>
          <span className="v">{deadline}</span>
          <span className="d">{deadlineNote}</span>
        </div>
      </div>
      <div className="project-overview-main">
        <ProjectUpcomingTasks
          currentUserId={currentUserId}
          employees={employees}
          isAdmin={isAdmin}
          project={project}
          tasks={tasks}
          today={today}
        />
        <ProjectProgress project={project} tasks={tasks} today={today} />
        {budget}
        <section aria-labelledby="project-about-heading" className="panel">
          <div className="panel-h">
            <h2 id="project-about-heading">About this project</h2>
          </div>
          <p className="project-overview-about">
            {project.description || "No project description has been added."}
          </p>
        </section>
      </div>
      <aside
        aria-label="Project details and updates"
        className="project-overview-aside"
      >
        <ProjectDetails employees={employees} project={project} teams={teams} />
        {milestones}
        <ProjectRecentActivity
          activity={activity}
          projectId={project.id}
          unavailable={activityUnavailable}
        />
      </aside>
    </div>
  );
};

export { ProjectOverview };
