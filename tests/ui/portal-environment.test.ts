import { expect, test } from "bun:test";

import { parseEnvironment } from "@/features/portal/portal-environment";

const EMPTY = { browser: "", device: "", os: "" };

test("parseEnvironment reads a stored snapshot", () => {
  const snapshot = JSON.stringify({
    browser: "Firefox 132",
    device: "Desktop, 1920×1080 screen",
    os: "macOS",
  });
  expect(parseEnvironment(snapshot)).toEqual({
    browser: "Firefox 132",
    device: "Desktop, 1920×1080 screen",
    os: "macOS",
  });
});

test("parseEnvironment falls back to blanks for missing or odd snapshots", () => {
  expect(parseEnvironment("")).toEqual(EMPTY);
  expect(parseEnvironment("[]")).toEqual(EMPTY);
  expect(parseEnvironment(JSON.stringify({ browser: 3, os: "Linux" }))).toEqual(
    { ...EMPTY, os: "Linux" }
  );
});
