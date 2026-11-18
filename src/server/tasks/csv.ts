// Pure CSV helpers for task export and import. Nothing here touches the
// database, so every rule can be tested without a fixture.

export type CsvCell = string | number | null | undefined;

// Spreadsheets run a cell as a formula when it starts with one of these.
const FORMULA_PREFIX = /^[=+\-@\t\r]/u;

const NEEDS_QUOTES = /[",\r\n]/u;

export const escapeCsvCell = (value: CsvCell): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return String(value);
  }
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

export const formatCsv = (rows: readonly (readonly CsvCell[])[]): string =>
  rows.map((row) => `${row.map(escapeCsvCell).join(",")}\r\n`).join("");
