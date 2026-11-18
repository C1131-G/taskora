import { and } from "@prisma/orm-postgres/orm-client";

import type { Transaction } from "../work/work-internal";

interface ShareableProject {
  readonly archivedAt: Date | null;
  readonly clientVisible: boolean;
}

interface ShareableTask {
  readonly archivedAt: Date | null;
  readonly clientVisible: boolean;
}

// An administrator marked the project shared and it is not archived.
export const isProjectShared = (project: ShareableProject): boolean =>
  project.clientVisible && !project.archivedAt;

// Someone marked the task "show to client", it is not archived, and its
// project is shared.
export const isTaskShared = (
  task: ShareableTask,
  project: ShareableProject
): boolean =>
  task.clientVisible && !task.archivedAt && isProjectShared(project);

// The projects a client company may see: assigned to the company (and not
// taken off it) AND shared. Either alone is not enough, and an archived
// project is never shown. Pass a project id to look at that one only.
export const loadSharedProjects = async (
  transaction: Transaction,
  companyId: string,
  onlyProjectId?: string
) => {
  const links = await transaction.orm.public.ClientCompanyProject.where({
    companyId,
    removedAt: null,
  })
    .select("projectId")
    .all();
  const assigned = links.flatMap(({ projectId }) =>
    onlyProjectId === undefined || projectId === onlyProjectId
      ? [projectId]
      : []
  );
  if (assigned.length === 0) {
    return [];
  }
  return await transaction.orm.public.Project.where((project) =>
    and(
      project.id.in(assigned),
      project.clientVisible.eq(true),
      project.archivedAt.isNull()
    )
  ).all();
};
