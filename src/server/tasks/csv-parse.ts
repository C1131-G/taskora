export const MAX_IMPORT_ROWS = 500;

export const MAX_IMPORT_BYTES = 1_000_000;

export const MAX_TITLE_LENGTH = 240;

export const MAX_DESCRIPTION_LENGTH = 20_000;

export const MAX_ASSIGNEES = 100;

export const ESCAPED_FORMULA = /^'[=+\-@\t\r]/u;

const BYTE_ORDER_MARK = "﻿";

export type CsvParseResult =
  | { readonly ok: true; readonly rows: readonly (readonly string[])[] }
  | { readonly ok: false; readonly message: string };

export const parseCsv = (input: string): CsvParseResult => {
  const text = input.startsWith(BYTE_ORDER_MARK) ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let touched = false;
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
    touched = false;
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text.charAt(index);
    if (inQuotes) {
      if (character !== '"') {
        cell += character;
      } else if (text.charAt(index + 1) === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = false;
      }
    } else if (character === '"') {
      inQuotes = true;
      touched = true;
    } else if (character === ",") {
      endCell();
      touched = true;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text.charAt(index + 1) === "\n") {
        index += 1;
      }
      endRow();
    } else {
      cell += character;
      touched = true;
    }
  }
  if (inQuotes) {
    return { message: "A quoted value is never closed.", ok: false };
  }
  if (touched || cell !== "") {
    endRow();
  }
  return { ok: true, rows };
};
