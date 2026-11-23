import { Effect } from "effect";
import { useRouter } from "expo-router";
import { useCallback } from "react";

import { SearchScreen, type ListRow } from "@/features/workspace/domain-list-screen";
import { searchProgram } from "@/features/workspace/domain-queries";
import { useApi } from "@/runtime/api-hooks";

export default function Route() {
  const api = useApi();
  const router = useRouter();

  const onHit = useCallback(
    (hit: ListRow) => router.push(hit.kind === "project" ? "/projects" : "/tasks"),
    [router],
  );

  return (
    <SearchScreen
      onHit={onHit}
      search={(query) => (api === null ? Effect.succeed({ rows: [] }) : searchProgram(api, query))}
    />
  );
}
