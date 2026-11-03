/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import {
  Briefcase,
  CheckCircle,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkelterSurface } from "@/components/workspace/skelter-surface";
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

const SECTIONS = [
  { Icon: Briefcase, title: "Projects" },
  { Icon: CheckCircle, title: "Open tasks" },
  { Icon: UsersThree, title: "Members" },
] as const;

const SECTION_ROWS = SKELETON_KEYS.slice(0, 3);

const TeamTasksSkeleton = () => (
  <section className="panel">
    <div className="panel-h team-overview-section-heading">
      <div className="team-section-title">
        <CheckCircle aria-hidden="true" size={18} />
        <h2>Open tasks</h2>
      </div>
      <span className="ct">
        <SkeletonBone shape="short" />
      </span>
    </div>
    <SkelterSurface label="Loading team open tasks…">
      <div className="panel-b stack">
        {SECTION_ROWS.map((key) => (
          <SkeletonBone key={key} />
        ))}
      </div>
    </SkelterSurface>
  </section>
);

// Mirrors TeamOverview: section titles are static; the team name, counts and
// rows are data.
const TeamDetailSkeleton = () => (
  <div className="team-overview">
    <header className="ph team-overview-heading">
      <div>
        <div className="team-overview-title">
          <SkeletonBone shape="title" />
        </div>
        <p>Projects and people in this team.</p>
      </div>
    </header>
    <div className="team-overview-grid">
      {SECTIONS.map(({ Icon, title }) => (
        <section className="panel" key={title}>
          <div className="panel-h team-overview-section-heading">
            <div className="team-section-title">
              <Icon aria-hidden="true" size={18} />
              <h2>{title}</h2>
            </div>
            <span className="ct">
              <SkeletonBone shape="short" />
            </span>
          </div>
          <SkelterSurface label={`Loading team ${title.toLowerCase()}…`}>
            <div className="panel-b stack">
              {SECTION_ROWS.map((key) => (
                <SkeletonBone key={key} />
              ))}
            </div>
          </SkelterSurface>
        </section>
      ))}
    </div>
  </div>
);

export { TeamDetail, TeamDetailSkeleton };
