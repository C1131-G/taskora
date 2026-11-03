/* eslint-disable shadcn/no-unknown-classes */

import { PanelSkeleton } from "@/components/workspace/panel-skeleton";
import { MyTimeView } from "@/features/time/components/my-time-view";
import {
  getRunningTimer,
  getWeeklyTime,
  listAssignedTaskOptions,
} from "@/features/time/time-queries";
import { readOrThrow } from "@/lib/read-result";
import { getUtcToday } from "@/src/lib/utc-today";
import { getPageSession } from "@/src/server/auth/page-session";

const MyTime = async ({ date }: { readonly date: string | null }) => {
  // The session read comes first: it is request data, so the current date below
  // is computed at request time rather than while prerendering.
  const session = await getPageSession();
  if (session.kind !== "authenticated") {
    throw new Error("Your time could not be loaded.");
  }
  const [week, timer, options] = await Promise.all([
    getWeeklyTime({ date: date ?? getUtcToday() }),
    getRunningTimer({}),
    listAssignedTaskOptions({}),
  ]);
  return (
    <MyTimeView
      currentUserId={session.user.id}
      isAdmin={session.user.role === "admin"}
      taskChoices={readOrThrow(options, "Your tasks")}
      timer={readOrThrow(timer, "Your timer")}
      week={readOrThrow(week, "Your week")}
    />
  );
};

const MyTimeSkeleton = () => (
  <PanelSkeleton label="Loading your time…" rows={5} variant="list" />
);

export { MyTime, MyTimeSkeleton };
