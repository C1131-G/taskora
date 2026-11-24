import type { Effect } from "effect";
import { withSkeleton } from "react-zero-skeleton";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import type { AppFailure } from "@/errors";
import { ScrollView, StyleSheet, Text, View, type ListRenderItem } from "react-native";
import { CheckCircle, CircleIcon } from "phosphor-react-native";

import { WorkspaceChip } from "@/components/workspace/workspace-chip";
import { WorkspaceEmptyState } from "@/components/workspace/workspace-empty-state";
import { failureMessage } from "@/components/workspace/workspace-error-state";
import { useErrorToast } from "@/components/workspace/error-toast-context";
import { WorkspaceListGroup, WorkspaceListRow } from "@/components/workspace/workspace-list-row";
import { WorkspaceLoadingRegion } from "@/components/workspace/workspace-loading";
import { WorkspaceListScreen, WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { TaskStatusTrigger } from "@/features/tasks/task-status-sheet";
import { TASK_STATUS_ORDER, taskStatusLabel } from "@api/task-statuses";
import {
  changeTask,
  setSubtaskStatus,
  type TaskPriority,
  type TaskStatus,
} from "@/features/tasks/queries";
import { useApiMutation, type ApiContextValue, type KeysContextValue } from "@/runtime/api-hooks";
import { taskKeys } from "@/runtime/query-keys";
import { useHapticFeedback } from "@/runtime/haptics-hooks";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { spacing, theme } from "@/theme/tokens.generated";

const STATUS_FILTERS: readonly (TaskStatus | "all")[] = ["all", ...TASK_STATUS_ORDER];

export interface TaskRowModel {
  readonly dueAt: string | null;
  readonly id: string;
  readonly priority: TaskPriority;
  readonly projectName: string;
  readonly status: TaskStatus;
  readonly title: string;
}

/** Filters the task list to one status (pure; pinned by tests). */
export const filterTasks = <T extends { readonly status: TaskStatus }>(
  tasks: readonly T[],
  status: TaskStatus | "all",
): readonly T[] => (status === "all" ? tasks : tasks.filter((task) => task.status === status));

interface MyTasksContentProps {
  readonly onOpenTask: (id: string) => void;
  readonly tasks: readonly TaskRowModel[];
}

/** The status chips; shared by the loaded header and the loading bones. */
const StatusFilters = ({
  filter,
  onChange,
}: {
  readonly filter: TaskStatus | "all";
  readonly onChange: (status: TaskStatus | "all") => void;
}) => (
  <ScrollView
    contentContainerStyle={styles.filters}
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.filterStrip}
  >
    {STATUS_FILTERS.map((status) => (
      <WorkspaceChip
        color={status === "all" ? "gray" : "green"}
        key={status}
        label={status === "all" ? "All" : taskStatusLabel(status)}
        onPress={() => onChange(status)}
        selected={filter === status}
      />
    ))}
  </ScrollView>
);

/** The loading body only: Skelter measures it, so it mirrors the real chips and rows. */
const MyTasksPlaceholder = ({ tasks }: { readonly tasks: readonly TaskRowModel[] }) => (
  <View style={styles.content}>
    <StatusFilters filter="all" onChange={noopFilter} />
    <WorkspaceListGroup>
      {tasks.map((task) => (
        <WorkspaceListRow
          key={task.id}
          subtitle={`${task.projectName} · ${task.priority}`}
          title={task.title}
        />
      ))}
    </WorkspaceListGroup>
  </View>
);

const noopFilter = (): void => undefined;

const SkelterMyTasksPlaceholder = withSkeleton(MyTasksPlaceholder);

const keyOfTask = (task: TaskRowModel): string => task.id;

/** One virtualized task row; the open handler takes the id so its identity stays stable. */
const TaskRow = memo(function TaskRow({
  onOpen,
  task,
}: {
  readonly onOpen: (id: string) => void;
  readonly task: TaskRowModel;
}) {
  const open = useCallback(() => onOpen(task.id), [onOpen, task.id]);

  return (
    <WorkspaceListGroup>
      <WorkspaceListRow
        accessibilityLabel={`Open task ${task.title}`}
        onPress={open}
        subtitle={`${task.projectName} · ${task.priority}`}
        title={task.title}
      />
    </WorkspaceListGroup>
  );
});

/** The My tasks screen; the title stays real while the rows load. */
export const MyTasksScreen = ({ isLoading, onOpenTask, tasks }: MyTasksContentProps & { readonly isLoading: boolean }) => {
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const visible = useMemo(() => filterTasks(tasks, filter), [tasks, filter]);
  const renderItem = useCallback<ListRenderItem<TaskRowModel>>(
    ({ item }) => <TaskRow onOpen={onOpenTask} task={item} />,
    [onOpenTask],
  );

  if (isLoading) {
    return (
      <WorkspaceListScreen
        data={NO_TASKS}
        empty={
          <WorkspaceLoadingRegion isLoading label="Loading my tasks">
            <SkelterMyTasksPlaceholder hasSkeleton isLoading tasks={tasks} />
          </WorkspaceLoadingRegion>
        }
        keyExtractor={keyOfTask}
        renderItem={renderItem}
        title="My tasks"
      />
    );
  }

  return (
    <WorkspaceListScreen
      data={visible}
      empty={<WorkspaceEmptyState message="No tasks in this view." title="Nothing here" />}
      footer={
        <Text style={[typeStyle("xs"), styles.count, { color: palette.text3 }]}>
          {visible.length} of {tasks.length} tasks
        </Text>
      }
      header={<StatusFilters filter={filter} onChange={setFilter} />}
      keyExtractor={keyOfTask}
      renderItem={renderItem}
      title="My tasks"
    />
  );
};

const NO_TASKS: readonly TaskRowModel[] = [];

export interface TaskDetailModel {
  readonly projectName: string;
  readonly status: TaskStatus;
  readonly subtasks: readonly { readonly completed: boolean; readonly id: string; readonly title: string }[];
  readonly title: string;
  readonly version: number;
}

/** One task write: its intent key, the program, and how to drop its optimistic override. */
interface TaskWrite {
  readonly intent: string;
  readonly settle: () => void;
  readonly write: Effect.Effect<unknown, AppFailure>;
}

interface TaskDetailContentProps {
  /** Null while the session restores; the screen then only renders its skeleton. */
  readonly api: ApiContextValue | null;
  readonly keys: KeysContextValue | null;
  readonly task: TaskDetailModel;
  readonly taskId: string;
}

/**
 * The task detail body: status mover and subtasks, each write under its own
 * key. A status or subtask shows its new value at once and goes back if the
 * server refuses the change.
 */
const TaskDetailContent = ({ api, keys, task, taskId }: TaskDetailContentProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const showError = useErrorToast();
  const haptic = useHapticFeedback();
  const [shownStatus, setShownStatus] = useState<TaskStatus | undefined>(undefined);
  const [shownSubtasks, setShownSubtasks] = useState<Readonly<Record<string, boolean>>>({});
  const status = shownStatus ?? task.status;
  // A second tap while an intent's write is pending would reuse its
  // idempotency key and get the first tap's replayed result, so it is ignored.
  const pendingIntents = useRef(new Set<string>());

  // Every write refreshes the task on success or reports the failure, then
  // drops its optimistic override so the screen shows the server's value.
  // The callbacks live on the hook, not on `mutate`: two writes can be in
  // flight (a subtask and the status), and per-call callbacks only fire for
  // the latest call.
  const { mutate } = useApiMutation<TaskWrite, unknown>({
    invalidates: [taskKeys.all],
    mutationKey: [...taskKeys.all, "write"],
    onError: (failure) => {
      haptic("error");
      showError(failure === undefined ? "Could not update the task." : failureMessage(failure));
    },
    onSettled: ({ intent, settle }) => {
      pendingIntents.current.delete(intent);
      settle();
    },
    program: ({ write }) => write,
  });
  const run = (intent: string, write: Effect.Effect<unknown, AppFailure>, settle: () => void): void =>
    mutate({ intent, settle, write });

  const claimIntent = (intent: string): boolean => {
    if (pendingIntents.current.has(intent)) return false;
    pendingIntents.current.add(intent);
    return true;
  };

  const moveTo = (next: TaskStatus): void => {
    const intent = `move-${taskId}`;
    if (api === null || keys === null || next === status || !claimIntent(intent)) return;
    haptic("light");
    setShownStatus(next);
    run(
      intent,
      keys.run(intent, (key) =>
        changeTask(api, key, taskId, { expectedVersion: task.version, status: next }),
      ),
      () => setShownStatus(undefined),
    );
  };

  const toggleSubtask = (subtask: TaskDetailModel["subtasks"][number]): void => {
    const intent = `toggle-${subtask.id}`;
    if (api === null || keys === null || !claimIntent(intent)) return;
    const completed = !(shownSubtasks[subtask.id] ?? subtask.completed);
    haptic("light");
    setShownSubtasks((current) => ({ ...current, [subtask.id]: completed }));
    run(
      intent,
      keys.run(intent, (key) =>
        setSubtaskStatus(api, key, taskId, subtask.id, task.version, completed),
      ),
      () =>
        setShownSubtasks((current) => {
          const { [subtask.id]: _settled, ...rest } = current;
          return rest;
        }),
    );
  };

  return (
    <View style={styles.content}>
      <View style={styles.meta}>
        <Text style={[typeStyle("sm"), { color: palette.text3 }]}>{task.projectName}</Text>
        <TaskStatusTrigger current={status} onMove={moveTo} />
      </View>
      <WorkspaceListGroup label="Subtasks">
        {task.subtasks.map((subtask) => {
          const completed = shownSubtasks[subtask.id] ?? subtask.completed;
          return (
            <WorkspaceListRow
              accessibilityLabel={`Toggle subtask ${subtask.title}`}
              key={subtask.id}
              onPress={() => toggleSubtask(subtask)}
              leading={
                completed ? (
                  <CheckCircle color={palette.green} size={22} weight="fill" />
                ) : (
                  <CircleIcon color={palette.text3} size={22} />
                )
              }
              title={subtask.title}
              trailing={
                <Text style={[typeStyle("sm"), { color: completed ? palette.green : palette.text3 }]}>
                  {completed ? "Done" : "Open"}
                </Text>
              }
            />
          );
        })}
      </WorkspaceListGroup>
    </View>
  );
};

const SkelterTaskDetailContent = withSkeleton(TaskDetailContent);

/**
 * The task detail screen. The title is the task's own, so while it loads the
 * header reads a neutral "Task" instead of a placeholder posing as real text.
 */
export const TaskDetailScreen = ({ isLoading, ...props }: TaskDetailContentProps & { readonly isLoading: boolean }) => (
  <WorkspaceScreen title={isLoading ? "Task" : props.task.title}>
    <WorkspaceLoadingRegion isLoading={isLoading} label="Loading task">
      <SkelterTaskDetailContent hasSkeleton={isLoading} isLoading={isLoading} {...props} />
    </WorkspaceLoadingRegion>
  </WorkspaceScreen>
);

const styles = StyleSheet.create({
  content: {
    // Matches WorkspaceScreen's content gap, which no longer reaches these children.
    gap: spacing.s4,
  },
  count: {
    textAlign: "center",
  },
  filterStrip: {
    // Bleed to the screen edge so chips scroll out from under the gutter.
    marginHorizontal: -spacing.s4,
  },
  filters: {
    gap: spacing.s2,
    paddingHorizontal: spacing.s4,
  },
  meta: {
    gap: spacing.s2,
  },
});
