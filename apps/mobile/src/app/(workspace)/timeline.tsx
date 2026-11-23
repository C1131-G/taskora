import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { timelineProgram } from "@/features/workspace/more-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Timeline"
      makeProgram={(api) => timelineProgram(api)}
      queryKey={domainKeys.list("timeline")}
      screenTitle="Timeline"
    />
  );
}
