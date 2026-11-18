import { Effect } from "effect";

import type { AppFailure } from "@/errors";
import type { ListRow } from "@/features/workspace/domain-list-screen";
import type { MobileClient } from "@api/client";
import type { MobileApi } from "@/services/mobile-api";

type Api = MobileApi["Service"];

export interface TimeEntry {
  readonly date: string;
  readonly hours: number;
  readonly id: string;
  readonly projectName: string;
  readonly taskId: string | null;
  readonly taskTitle: string | null;
}

export interface PersonLoad {
  readonly id: string;
  readonly loadHours: number;
  readonly name: string;
  readonly openTasks: number;
  readonly overHours: number;
}

export interface BudgetSummary {
  readonly billedHours: number;
  readonly id: string;
  readonly plannedHours: number;
  readonly projectName: string;
}

export interface FileSummary {
  readonly copyStatus: "failed" | "none" | "pending" | "ready";
  readonly id: string;
  readonly name: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly sizeLabel: string;
  readonly uploadedBy: string;
}

export interface MemberSummary {
  readonly employeeNumber: string;
  readonly id: string;
  readonly name: string;
  readonly role: "admin" | "employee";
  readonly teamName: string | null;
  readonly title: string | null;
}

export interface TeamSummary {
  readonly id: string;
  readonly memberCount: number;
  readonly name: string;
}

export interface ClientCompanySummary {
  readonly active: boolean;
  readonly contactEmail: string | null;
  readonly id: string;
  readonly name: string;
}

export interface ActivityItem {
  readonly actorName: string;
  readonly at: string;
  readonly detail: string;
  readonly id: string;
  readonly kind: string;
  readonly taskTitle: string | null;
}

export interface KindItem {
  readonly id: string;
  readonly kind: string;
  readonly subtitle?: string | null;
  readonly title: string;
}

export interface ArchivedItem {
  readonly archivedAt: string;
  readonly id: string;
  readonly kind: string;
  readonly title: string;
}


const call = <A>(
  api: Api,
  run: (client: MobileClient) => Promise<A>,
): Effect.Effect<A, AppFailure> =>
  api.call(run);

const rows = <T>(
  items: readonly T[],
  project: (item: T) => ListRow,
): { rows: readonly ListRow[] } => ({
  rows: items.map(project),
});

/** My Time: the signed-in user's entries. */
export const myTimeProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listMyTime({ query: {} })), (page) =>
    rows(page.entries, (entry) => ({
      id: entry.id,
      subtitle: `${entry.workDate} · ${entry.taskReference} · ${hoursOf(entry.minutes)}h`,
      title: entry.taskTitle,
    })),
  );

const openTasksOf = (person: {
  readonly unscheduled: { readonly taskCount: number };
  readonly weeks: readonly { readonly taskCount: number }[];
}): number =>
  person.weeks.reduce((sum, week) => sum + week.taskCount, person.unscheduled.taskCount);

/** Workload: each person's open load. */
export const workloadProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listWorkload()), (page) =>
    rows(page.people, (person) => ({
      id: person.userId,
      subtitle: `${openTasksOf(person)} open tasks · peak ${person.peakLoadHours}h a week`,
      title: person.name,
    })),
  );

const MINUTES_PER_HOUR = 60;
const hoursOf = (minutes: number): number =>
  Math.round((minutes / MINUTES_PER_HOUR) * 10) / 10;

/** Budgets: planned versus billed hours. */
export const budgetsProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listBudgets({ query: {} })), (page) =>
    rows(page.items, (budget) => ({
      id: budget.projectId,
      subtitle: `${hoursOf(budget.spentMinutes)} of ${hoursOf(budget.budgetMinutes)} hours billed`,
      title: budget.projectName,
    })),
  );

const BYTES_PER_KB = 1024;
const sizeLabelOf = (bytes: number): string => {
  if (bytes < BYTES_PER_KB) {
    return `${bytes} B`;
  }
  const kb = bytes / BYTES_PER_KB;
  return kb < BYTES_PER_KB
    ? `${Math.round(kb)} KB`
    : `${(kb / BYTES_PER_KB).toFixed(1)} MB`;
};

/** Files: standalone workspace files. */
export const filesProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listFiles({ query: {} })), (page) =>
    rows(page.items, (file) => ({
      id: file.id,
      subtitle: `${file.projectName} · ${sizeLabelOf(file.sizeBytes)} · ${file.copyState}`,
      title: file.originalName,
    })),
  );

/** Members: the employee directory. */
export const membersProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listMembers({ query: {} })), (page) =>
    rows(page.items, (member) => ({
      id: member.id,
      subtitle: `${member.employeeId} · ${member.role}${member.teamName === null ? "" : ` · ${member.teamName}`}`,
      title: member.name,
    })),
  );

/** Teams: names and member counts. */
export const teamsProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listTeams({ query: {} })), (page) =>
    rows(page.items, (team) => ({
      id: team.id,
      subtitle: `${team.memberCount} members`,
      title: team.name,
    })),
  );

/** Clients: the client companies. */
export const clientsProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listClientCompanies({ query: {} })), (page) =>
    rows(page.items, (company) => ({
      id: company.id,
      subtitle: `${company.projectCount} projects · ${company.openBugCount} open bugs${company.active ? "" : " · inactive"}`,
      title: company.name,
    })),
  );

/** Activity: the workspace feed. */
export const activityProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listActivity({ query: {} })), (page) =>
    rows(page.items, (item) => ({
      id: item.id,
      subtitle: `${item.actorName} · ${item.createdAt.slice(0, 10)}`,
      title: `${item.action.replaceAll("_", " ")}${item.taskTitle ?? item.projectName ? `: ${item.taskTitle ?? item.projectName}` : ""}`,
    })),
  );

/** Favorites: starred projects and tasks. */
export const favoritesProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listFavorites({ query: {} })), (page) =>
    rows(page.items, (item) => ({
      id: item.id,
      kind: item.kind,
      subtitle: item.subtitle ?? item.kind,
      title: item.title,
    })),
  );

/** Archive: archived projects and tasks. */
export const archiveProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listArchive({ query: {} })), (page) =>
    rows(page.items, (item) => ({
      id: item.id,
      subtitle: `${item.kind} · archived ${item.archivedAt.slice(0, 10)}`,
      title: item.title,
    })),
  );

/** Search: projects and tasks by text, tasks first. */
export const searchProgram = (api: Api, query: string) =>
  Effect.map(
    call(api, (client) => client.searchWorkspace({ query: { q: query } })),
    (page) =>
      rows(
        [
          ...page.tasks.map((task) => ({
            id: task.id,
            kind: "task",
            subtitle: task.projectName,
            title: task.title,
          })),
          ...page.projects.map((project) => ({
            id: project.id,
            kind: "project",
            subtitle: "Project",
            title: project.name,
          })),
        ],
        (hit) => ({ id: hit.id, kind: hit.kind, subtitle: hit.subtitle, title: hit.title }),
      ),
  );
