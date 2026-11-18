// The panel may edit when the task is not loaded yet, when the task is at the
// version the caller holds, or when this panel itself produced that version.
export const isVersionCurrent = (
  task: { readonly version: number } | null,
  version: number,
  trustedVersion: number | null
): boolean =>
  task === null || task.version === version || trustedVersion === version;
