import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { PortalListBody } from "@/features/portal/portal-list";
import { portalKeys } from "@/runtime/query-keys";
import { portalNotificationsProgram } from "@/features/portal/portal-queries";

export default function Route() {
  return (
    <WorkspaceScreen title="Notifications">
      <PortalListBody
        emptyTitle="Notifications"
        program={(api) => portalNotificationsProgram(api)}
        queryKey={portalKeys.notifications()}
      />
    </WorkspaceScreen>
  );
}
