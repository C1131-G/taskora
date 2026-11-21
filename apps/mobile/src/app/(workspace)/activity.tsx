import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { activityProgram } from "@/features/workspace/domain-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Activity"
      makeProgram={(api) => activityProgram(api)}
      queryKey={domainKeys.list("activity")}
      screenTitle="Activity"
    />
  );
}
