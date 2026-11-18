import { and, or } from "@prisma/orm-postgres/orm-client";

import {
  clientStatusLabel,
  internalStatusesFor,
} from "@/features/portal/client-status";

import type { InboxCursor } from "../notifications/inbox-cursor";
import { decodeBugWorkflowStatus } from "../work/bug-workflow-internal";
import type { Transaction } from "../work/work-internal";
import type { PortalActor, PortalBugSummary } from "./portal-contracts";
import type { ListCompanyBugsInput } from "./portal-input-contracts";

// The company's bugs that match the filters, newest first with the id as the
// tie-breaker, starting after a position when one is given.
export const findBugs = (
  transaction: Transaction,
  actor: PortalActor,
  input: ListCompanyBugsInput,
  after: InboxCursor | null,
  count: number
) => {
  const label = input.status;
  // "Not a bug" is a closed bug with that resolution, so both labels also
  // look at the resolution.
  const statuses = label ? [...internalStatusesFor(label)] : [];
  return transaction.orm.public.BugReport.where((bug) =>
    and(
      bug.clientCompanyId.eq(actor.clientCompanyId),
      ...(input.projectId ? [bug.projectId.eq(input.projectId)] : []),
      ...(input.mine ? [bug.reporterId.eq(actor.id)] : []),
      ...(label ? [bug.status.in(statuses)] : []),
      ...(label === "not_a_bug" ? [bug.resolution.eq("not_a_bug")] : []),
      ...(label === "closed"
        ? [or(bug.resolution.isNull(), bug.resolution.neq("not_a_bug"))]
        : []),
      ...(after
        ? [
            or(
              bug.discoveredAt.lt(after.createdAt),
              and(bug.discoveredAt.eq(after.createdAt), bug.id.lt(after.id))
            ),
          ]
        : [])
    )
  )
    .orderBy([(bug) => bug.discoveredAt.desc(), (bug) => bug.id.desc()])
    .limit(count)
    .all();
};

export type FoundBug = Awaited<ReturnType<typeof findBugs>>[number];

// What the list shows for each bug. A bug whose task was archived is left out.
export const summarize = async (
  transaction: Transaction,
  actor: PortalActor,
  bugs: readonly FoundBug[]
): Promise<PortalBugSummary[]> => {
  if (bugs.length === 0) {
    return [];
  }
  const [tasks, projects, reporters] = await Promise.all([
    transaction.orm.public.Task.where((task) =>
      task.id.in(bugs.map(({ taskId }) => taskId))
    ).all(),
    transaction.orm.public.Project.where((project) =>
      project.id.in([...new Set(bugs.map(({ projectId }) => projectId))])
    ).all(),
    transaction.orm.public.User.where((user) =>
      user.id.in([...new Set(bugs.map(({ reporterId }) => reporterId))])
    )
      .select("id", "name")
      .all(),
  ]);
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const reporterById = new Map(reporters.map((user) => [user.id, user.name]));
  return bugs.flatMap((bug) => {
    const task = taskById.get(bug.taskId);
    const project = projectById.get(bug.projectId);
    if (!task || !project || task.archivedAt) {
      return [];
    }
    return [
      {
        createdAt: bug.createdAt.toISOString(),
        id: bug.id,
        impact: bug.clientImpact,
        isMine: bug.reporterId === actor.id,
        key: `${project.key}-${task.projectTaskNumber}`,
        projectId: project.id,
        projectName: project.name,
        reporterName: reporterById.get(bug.reporterId) ?? "A colleague",
        status: clientStatusLabel(
          decodeBugWorkflowStatus(bug.status),
          bug.resolution
        ),
        title: task.title,
        updatedAt: bug.updatedAt.toISOString(),
      },
    ];
  });
};
