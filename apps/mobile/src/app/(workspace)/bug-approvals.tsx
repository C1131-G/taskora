import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { bugApprovalsProgram } from "@/features/workspace/more-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Bug approvals"
      makeProgram={(api) => bugApprovalsProgram(api)}
      queryKey={domainKeys.list("bug-approvals")}
      screenTitle="Bug approvals"
    />
  );
}
