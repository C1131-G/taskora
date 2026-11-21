import { Effect } from "effect";

import { subtaskStatusRoute } from "@/src/mobile-api/routes-task-subtasks";
import { respondWith } from "@/src/server/api/http-response";
import { readRouteInput } from "@/src/server/api/route-input";
import { setTaskSubtaskStatus } from "@/src/server/api/tasks/task-subtasks";
import { AuthSessionLive } from "@/src/server/auth/session";
import { IdempotencyLive } from "@/src/server/core/idempotency";

export const POST = async (
  request: Request,
  context: RouteContext<"/api/v1/workspace/tasks/[taskId]/subtasks/[subtaskId]/status">
): Promise<Response> => {
  const params = await context.params;
  return respondWith(
    Effect.gen(function* handle() {
      const input = yield* readRouteInput(subtaskStatusRoute, request, params);
      return yield* setTaskSubtaskStatus(
        request.headers,
        input.params.taskId,
        input.params.subtaskId,
        input.body,
        input.idempotencyKey
      );
    }).pipe(Effect.provide(AuthSessionLive), Effect.provide(IdempotencyLive))
  );
};
