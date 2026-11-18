interface ArchivedProject {
  readonly archivedAt: string | null;
  readonly id: string;
  readonly name: string;
  readonly version: number;
}

interface ArchivedTask {
  readonly archivedAt: string | null;
  readonly id: string;
  /** Tasks of an archived project come back only with their project. */
  readonly projectArchived: boolean;
  readonly projectName: string;
  readonly title: string;
  readonly version: number;
}

export type { ArchivedProject, ArchivedTask };
