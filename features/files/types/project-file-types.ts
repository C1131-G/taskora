import type { FileCopyState } from "@/src/server/storage/upload-states";

interface ProjectFile {
  readonly id: string;
  readonly projectId: string;
  readonly taskId: string | null;
  readonly originalName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly uploadedById: string;
  readonly createdAt: string;
  readonly copyState: FileCopyState;
}

type FileLayout = "grid" | "list";
type FileSort = "newest" | "oldest" | "name" | "size";

export const FILE_SORTS: readonly FileSort[] = [
  "newest",
  "oldest",
  "name",
  "size",
];

export type { FileLayout, FileSort, ProjectFile };
