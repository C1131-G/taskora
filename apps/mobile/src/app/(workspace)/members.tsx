import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { membersProgram } from "@/features/workspace/domain-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Members"
      makeProgram={(api) => membersProgram(api)}
      queryKey={domainKeys.list("members")}
      screenTitle="Members"
    />
  );
}
