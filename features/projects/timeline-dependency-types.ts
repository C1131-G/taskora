// Pixels the arrow runs straight out of a bar before it turns.
export const ELBOW = 12;

export interface DependencyTask {
  readonly id: string;
  readonly title: string;
  readonly startDate: string | null;
  readonly dueDate: string | null;
  readonly status: string;
  // Tasks that must finish before this one starts.
  readonly dependencyIds: readonly string[];
}

export interface DependencyLayoutInput {
  readonly barHeight: number;
  readonly barTop: number;
  readonly dayCount: number;
  readonly dayWidth: number;
  readonly from: string;
  readonly rowHeight: number;
  // Row index of every task that is on screen; a task missing here is hidden.
  readonly rowIndexById: ReadonlyMap<string, number>;
  // Every task the timeline knows about, shown or not.
  readonly tasks: readonly DependencyTask[];
}

export interface DependencyArrow {
  readonly blockerId: string;
  readonly clippedEnd: boolean;
  readonly clippedStart: boolean;
  // The dependent starts before the blocker ends.
  readonly conflict: boolean;
  readonly cyclic: boolean;
  readonly id: string;
  readonly path: string;
  readonly taskId: string;
}

export interface TaskDependencyDetail {
  readonly conflict: boolean;
  // A sentence for assistive technology, or null when the task has no links.
  readonly description: string | null;
}

export interface DependencyLayout {
  readonly arrows: readonly DependencyArrow[];
  readonly details: ReadonlyMap<string, TaskDependencyDetail>;
}
