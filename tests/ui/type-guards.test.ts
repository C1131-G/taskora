import { expect, test } from "bun:test";

import { isOneOf, isRecord, isStringRecord } from "@/src/lib/type-guards";

test("isRecord accepts plain objects only", () => {
  expect(isRecord({ a: 1 })).toBe(true);
  expect(isRecord(new Error("boom"))).toBe(true);
  expect(isRecord(null)).toBe(false);
  expect(isRecord([1, 2])).toBe(false);
  expect(isRecord("text")).toBe(false);
});

test("isStringRecord requires every value to be text", () => {
  expect(isStringRecord({ title: "Required" })).toBe(true);
  expect(isStringRecord({})).toBe(true);
  expect(isStringRecord({ title: 1 })).toBe(false);
  expect(isStringRecord("text")).toBe(false);
});

test("isOneOf matches listed literals only", () => {
  const units = ["minutes", "hours", "days"] as const;
  expect(isOneOf(units, "hours")).toBe(true);
  expect(isOneOf(units, "weeks")).toBe(false);
  expect(isOneOf(units, 3)).toBe(false);
  expect(isOneOf(["a", "b"], "toString")).toBe(false);
});
