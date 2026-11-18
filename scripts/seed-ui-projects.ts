import { Effect } from "effect";

import { db } from "../src/prisma/db";
// Fixture dates count from the day the seed runs. A fixed anchor drifted out of
// the timeline and calendar windows as the weeks passed, so the browser specs
// that look for these items started failing with no code change.
const seedDay = new Date();

export const isoDate = (offsetDays: number) => {
  const date = new Date(
    Date.UTC(
      seedDay.getUTCFullYear(),
      seedDay.getUTCMonth(),
      seedDay.getUTCDate() + offsetDays
    )
  );
  return date.toISOString().slice(0, 10);
};

export const findProjectId = (key: string) =>
  Effect.promise(async () => {
    const project = await db.orm.public.Project.where({ key })
      .select("id")
      .first();
    return project?.id ?? null;
  });
