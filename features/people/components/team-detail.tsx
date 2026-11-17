/* eslint-disable shadcn/no-restyle -- Skeletons reuse the real workspace button and input classes. */
/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

import { Progress } from "@/components/ui/progress";
import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { TeamOpenTasks } from "@/features/people/components/team-open-tasks";
import type { TeamTask } from "@/features/people/components/team-open-tasks";
import { TeamOverview } from "@/features/people/components/team-overview";
import {
  getTeam,
  listAllEmployees,
  listAllTeams,
} from "@/features/people/people-queries";
import { listProjects } from "@/features/projects/projects-queries";
import { listAllProjectTasks } from "@/features/tasks/tasks-queries";
import { readOrThrow } from "@/lib/read-result";
import { getPageSession } from "@/src/server/auth/page-session";

// Loaded on its own so the rest of the page shows first: tasks need the
// project list, and a team can own many projects.
const TeamOpenTasksPanel = async ({
  projects,
}: {
  readonly projects: readonly {
    readonly id: string;
    readonly key: string;
    readonly name: string;
  }[];
}) => {
  const taskResults = await Promise.all(
    projects.map(async (project) => ({
      project,
      tasks: await listAllProjectTasks(project.id),
    }))
  );
  if (taskResults.some(({ tasks }) => tasks === undefined)) {
    throw new Error("Team tasks could not be loaded.");
  }
  const tasks: TeamTask[] = taskResults.flatMap(({ project, tasks: items }) =>
    (items ?? []).map((task) => ({
      assignees: task.assignees,
      id: task.id,
      projectId: task.projectId,
      projectKey: project.key,
      projectName: project.name,
      projectTaskNumber: task.projectTaskNumber,
      status: task.status,
      title: task.title,
    }))
  );
  return <TeamOpenTasks tasks={tasks} />;
};

const SECTION_ROWS = SKELETON_KEYS.slice(0, 3);

// Panel heading of TeamOverview: the title is static, the count is data.
const SectionHeadingSkeleton = ({
  Icon,
  title,
}: {
  readonly Icon: Icon;
  readonly title: string;
}) => (
  <div className="panel-h team-overview-section-heading">
    <div className="team-section-title">
      <Icon aria-hidden="true" size={18} />
      <h2>{title}</h2>
    </div>
    <span className="ct">
      <SkeletonBone shape="line" width="2ch" />
    </span>
  </div>
);

// Mirrors TeamOpenTasks: status pill, title, key and assignees are data.
const TeamTaskRowsSkeleton = () => (
  <div className="team-open-task-list">
    {SECTION_ROWS.map((key) => (
      <div className="team-open-task-row" key={key}>
        <span className="team-task-status">
          <SkeletonBone shape="line" width="7ch" />
        </span>
        <span className="team-task-main">
          <strong>
            <SkeletonBone shape="line" width="22ch" />
          </strong>
          <span>
            <SkeletonBone shape="line" width="26ch" />
          </span>
        </span>
        <span className="team-task-assignees">
          <SkeletonBone shape="line" width="12ch" />
        </span>
      </div>
    ))}
  </div>
);

// The panel stays a direct grid child so the grid places it like the real one.
const TeamTasksSkeleton = () => (
  <section className="panel">
    <SectionHeadingSkeleton Icon={CheckCircle} title="Open tasks" />
    <SkeletonRegion label="Loading team open tasks…">
      <TeamTaskRowsSkeleton />
    </SkeletonRegion>
  </section>
);

const TeamDetail = async ({ teamId }: { readonly teamId: string }) => {
  const [team, teams, projectsResult, employeesResult, session] =
    await Promise.all([
      getTeam(teamId),
      listAllTeams(),
      listProjects({}),
      listAllEmployees(),
      getPageSession(),
    ]);
  const allProjects = readOrThrow(projectsResult, "Team projects");
  const employees = readOrThrow(employeesResult, "Team members");

  const projects = allProjects.filter((project) => project.teamId === team.id);
  const members = employees.filter((employee) => employee.teamId === team.id);

  return (
    <TeamOverview
      canManage={
        session.kind === "authenticated" && session.user.role === "admin"
      }
      members={members}
      projects={projects}
      tasksPanel={
        <SuspenseReveal fallback={<TeamTasksSkeleton />}>
          <TeamOpenTasksPanel projects={projects} />
        </SuspenseReveal>
      }
      team={team}
      teams={readOrThrow(teams, "Teams")}
    />
  );
};

// Mirrors TeamOverview: section titles are static; the team name, counts and
// rows are data. The admin-only Edit/Add buttons are left out, as most people
// never see them. Open tasks has its own boundary inside the loaded page.
const TeamDetailSkeleton = () => (
  <SkeletonRegion label="Loading team…">
    <div className="team-overview">
      <header className="ph team-overview-heading">
        <div>
          <div className="team-overview-title">
            <span aria-hidden="true" className="team-color-mark" />
            <h1>
              <SkeletonBone shape="line" width="8ch" />
            </h1>
          </div>
          <p>
            <SkeletonBone shape="line" width="16ch" />
          </p>
        </div>
      </header>
      <div className="team-overview-grid">
        <section className="panel">
          <SectionHeadingSkeleton Icon={Briefcase} title="Projects" />
          <div className="team-project-list">
            {SECTION_ROWS.slice(0, 2).map((key) => (
              <div className="team-project-row" key={key}>
                <span aria-hidden="true" className="team-project-mark" />
                <span className="team-project-main">
                  <span className="team-project-title">
                    <strong>
                      <SkeletonBone shape="line" width="18ch" />
                    </strong>
                    <span className="team-project-status">
                      <SkeletonBone shape="line" width="5ch" />
                    </span>
                  </span>
                  <Progress className="team-project-progress" value={0} />
                </span>
                <span className="team-project-percent">
                  <SkeletonBone shape="line" width="4ch" />
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <SectionHeadingSkeleton Icon={CheckCircle} title="Open tasks" />
          <TeamTaskRowsSkeleton />
        </section>
        <section className="panel">
          <SectionHeadingSkeleton Icon={UsersThree} title="Members" />
          <div className="team-member-list">
            {SECTION_ROWS.map((key) => (
              <div className="team-member-row" key={key}>
                <span aria-hidden="true" className="av" />
                <span className="team-member-main">
                  <strong>
                    <SkeletonBone shape="line" width="14ch" />
                  </strong>
                  <span>
                    <SkeletonBone shape="line" width="18ch" />
                  </span>
                </span>
                <span className="ct">
                  <SkeletonBone shape="line" width="8ch" />
                </span>
              </div>
            ))}
          </div>
          <div className="panel-b team-member-footer">
            <span className="team-members-link">
              View all members <ArrowRight aria-hidden="true" size={15} />
            </span>
          </div>
        </section>
      </div>
    </div>
  </SkeletonRegion>
);

export { TeamDetail, TeamDetailSkeleton };
