import { Effect } from "effect";

import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { PortalListBody } from "@/features/portal/portal-list";
import { listPortalBugs } from "@/features/portal/queries";
import { portalKeys } from "@/runtime/query-keys";

export default function Route() {
  return (
    <WorkspaceScreen title="Bugs">
      <PortalListBody
        emptyTitle="Bugs"
        program={(api) =>
          Effect.map(listPortalBugs(api), (bugs) => ({
            rows: bugs.map((bug) => ({
              id: bug.id,
              subtitle: `${bug.key} · ${bug.projectName} · ${bug.status}`,
              title: bug.title,
            })),
          }))
        }
        queryKey={portalKeys.bugRows()}
      />
    </WorkspaceScreen>
  );
}
