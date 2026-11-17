import type { ProjectSummary } from "@/features/workspace/queries";

/** Typical-length projects so Skelter sizes portal project bones like real ones. */
export const PLACEHOLDER_PORTAL_PROJECTS: readonly ProjectSummary[] = [
  { id: "placeholder-project-1", key: "WEB", name: "Website relaunch", openTasks: 12, progress: 64 },
  { id: "placeholder-project-2", key: "MOB", name: "Mobile onboarding flow", openTasks: 8, progress: 41 },
  { id: "placeholder-project-3", key: "POR", name: "Customer portal refresh", openTasks: 5, progress: 87 },
];
