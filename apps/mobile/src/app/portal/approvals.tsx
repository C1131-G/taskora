import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { PortalListBody } from "@/features/portal/portal-list";
import { portalKeys } from "@/runtime/query-keys";
import { portalApprovalsProgram } from "@/features/portal/portal-queries";

export default function Route() {
  return (
    <WorkspaceScreen title="Approvals">
      <PortalListBody
        emptyTitle="Approvals"
        program={(api) => portalApprovalsProgram(api)}
        queryKey={portalKeys.approvals()}
      />
    </WorkspaceScreen>
  );
}
