// Narrowing helpers for values whose shape the compiler cannot know, such as
// parsed JSON, error payloads and select values.

/** A non-array object whose keys can be read safely. */
export const isRecord = (
  value: unknown
): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Whether a value is one of a fixed list of literals. */
export const isOneOf = <const Value extends string>(
  values: readonly Value[],
  value: unknown
): value is Value => values.some((candidate) => candidate === value);
