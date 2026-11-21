import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { teamsProgram } from "@/features/workspace/domain-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Teams"
      makeProgram={(api) => teamsProgram(api)}
      queryKey={domainKeys.list("teams")}
      screenTitle="Teams"
    />
  );
}
