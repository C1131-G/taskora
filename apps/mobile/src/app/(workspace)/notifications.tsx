import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { notificationsProgram } from "@/features/workspace/more-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Notifications"
      makeProgram={(api) => notificationsProgram(api)}
      queryKey={domainKeys.list("notifications")}
      screenTitle="Notifications"
    />
  );
}
