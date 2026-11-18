export interface BugReportChoices {
  readonly discoverySource: string;
  readonly environment: string;
  readonly projectId: string;
  readonly severity: string;
}

const text = (formData: FormData, name: string): string =>
  String(formData.get(name) ?? "");

// Optional fields are sent as null when left empty.
const optionalText = (formData: FormData, name: string): string | null =>
  text(formData, name) || null;

export const bugReportInput = (
  formData: FormData,
  choices: BugReportChoices
) => ({
  actualBehavior: text(formData, "actualBehavior"),
  appVersion: optionalText(formData, "appVersion"),
  browser: optionalText(formData, "browser"),
  component: text(formData, "component"),
  description: optionalText(formData, "description"),
  device: optionalText(formData, "device"),
  discoverySource: choices.discoverySource,
  environment: choices.environment,
  expectedBehavior: text(formData, "expectedBehavior"),
  idempotencyKey: crypto.randomUUID(),
  os: optionalText(formData, "os"),
  projectId: choices.projectId,
  reproductionSteps: text(formData, "reproductionSteps")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
  route: text(formData, "route"),
  severity: choices.severity,
  title: text(formData, "title"),
});
