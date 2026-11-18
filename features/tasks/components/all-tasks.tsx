/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */

import { ErrorToast } from "@/components/workspace/error-toast";
import { getPersonalWorkspace } from "@/features/discovery/discovery-queries";
import { listAllEmployees } from "@/features/people/people-queries";
import { SearchParamFallback } from "@/features/projects/components/search-param-fallback";
import { listProjects } from "@/features/projects/projects-queries";
import {
  GlobalTasksWorkspace,
  GlobalTasksWorkspaceSkeleton,
} from "@/features/tasks/components/global-tasks-workspace";
import { TaskDrawerHost } from "@/features/tasks/components/task-drawer-host";
import { GlobalTaskViewStoreProvider } from "@/features/tasks/providers/global-task-view-store-provider";
import { canEditTaskRecord } from "@/features/tasks/task-permissions";
import { columnWidthsFromPreferences } from "@/features/tasks/task-table-columns";
import { listAllProjectTasks } from "@/features/tasks/tasks-queries";
import { getPersonalPreferences } from "@/features/user/user-queries";
import { getPageSession } from "@/src/server/auth/page-session";
import { getCompanyToday } from "@/src/server/work/work-company-today";

/* eslint-disable shadcn/no-restyle */

const AllTasks = async ({
  initialTaskId,
}: {
  readonly initialTaskId: string | null;
}) => {
  const [projects, session, employeeResult, personal, preferences, today] =
    await Promise.all([
      listProjects({}),
      getPageSession(),
      listAllEmployees(),
      getPersonalWorkspace({}),
      getPersonalPreferences({}),
      getCompanyToday(),
    ]);
  if (!projects.ok) {
    throw new Error("Tasks could not be loaded.");
  }

  const taskLists = await Promise.all(
    projects.data.map(async (project) => ({
      project,
      tasks: await listAllProjectTasks(project.id),
    }))
  );
  if (taskLists.some(({ tasks }) => tasks === undefined)) {
    throw new Error("Some project tasks could not be loaded.");
  }
  const allTasks = taskLists.flatMap(({ project, tasks }) =>
    (tasks ?? []).map((task) => ({
      ...task,
      projectKey: project.key,
      projectName: project.name,
    }))
  );
  const userId = session.kind === "authenticated" ? session.user.id : null;
  const isAdmin =
    session.kind === "authenticated" && session.user.role === "admin";
  const editableTaskIds = allTasks.flatMap((task) =>
    canEditTaskRecord(task, userId, isAdmin) ? [task.id] : []
  );
  const employees = employeeResult.ok ? employeeResult.data : [];
  const favoriteTaskIds = new Set(
    personal.ok ? personal.data.tasks.map(({ id }) => id) : []
  );

  return (
    <GlobalTaskViewStoreProvider
      initialColumnWidths={columnWidthsFromPreferences(
        preferences.ok ? preferences.data.taskTableColumnWidths : undefined
      )}
    >
      <TaskDrawerHost
        currentUserId={userId}
        editableTaskIds={editableTaskIds}
        employees={employees.map(({ id, name }) => ({ id, name }))}
        initialTaskId={initialTaskId}
        isAdmin={isAdmin}
        tasks={allTasks.map((task) => ({
          id: task.id,
          projectId: task.projectId,
          title: task.title,
          version: task.version,
        }))}
      >
        <ErrorToast
          message={employeeResult.ok ? null : employeeResult.error.message}
        />
        <ErrorToast
          message={preferences.ok ? null : preferences.error.message}
        />
        <ErrorToast message={personal.ok ? null : personal.error.message} />
        <GlobalTasksWorkspace
          employees={employees}
          favoriteTaskIds={favoriteTaskIds}
          isAdmin={isAdmin}
          projects={projects.data.map(({ id, name }) => ({ id, name }))}
          tasks={allTasks}
          today={today}
          userId={userId}
        />
      </TaskDrawerHost>
    </GlobalTaskViewStoreProvider>
  );
};

// The view comes from the URL, so the board and the table each get their own
// frame. The subtitle follows the filters and the task count, so it is a bone.
const AllTasksSkeleton = () => (
  <SearchParamFallback
    cases={{ board: <GlobalTasksWorkspaceSkeleton view="board" /> }}
    fallback={<GlobalTasksWorkspaceSkeleton view="list" />}
    name="view"
  />
);

export { AllTasks, AllTasksSkeleton };
