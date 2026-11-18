import { expect, test } from "bun:test";

import { readSlaTargets } from "@/features/settings/components/sla-settings-drafts";
import type { Drafts } from "@/features/settings/components/sla-settings-drafts";

const hours = (value: string) => ({ unit: "hours" as const, value });
const target = (first: string, resolution: string) => ({
  firstResponseMinutes: hours(first),
  resolutionMinutes: hours(resolution),
});
const drafts = (overrides: Partial<Drafts> = {}): Drafts => ({
  high: target("2", "8"),
  low: target("8", "40"),
  medium: target("4", "16"),
  urgent: target("1", "4"),
  ...overrides,
});

test("readSlaTargets converts every impact to business minutes", () => {
  expect(readSlaTargets(drafts(), 480)).toEqual({
    targets: {
      high: { firstResponseMinutes: 120, resolutionMinutes: 480 },
      low: { firstResponseMinutes: 480, resolutionMinutes: 2400 },
      medium: { firstResponseMinutes: 240, resolutionMinutes: 960 },
      urgent: { firstResponseMinutes: 60, resolutionMinutes: 240 },
    },
  });
});

test("readSlaTargets reports the topmost missing target first", () => {
  expect(
    readSlaTargets(
      drafts({ high: target("", "8"), medium: target("4", "") }),
      480
    )
  ).toEqual({
    message: "Enter a first response and resolution target for Medium.",
  });
});

test("readSlaTargets rejects targets beyond a year of minutes", () => {
  const result = readSlaTargets(
    drafts({
      urgent: {
        ...target("1", "4"),
        resolutionMinutes: { unit: "minutes", value: "600000" },
      },
    }),
    480
  );
  expect("message" in result && result.message).toStartWith("Urgent targets");
});
