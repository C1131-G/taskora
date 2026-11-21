import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { budgetsProgram } from "@/features/workspace/domain-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Budgets"
      makeProgram={(api) => budgetsProgram(api)}
      queryKey={domainKeys.list("budgets")}
      screenTitle="Budgets"
    />
  );
}
