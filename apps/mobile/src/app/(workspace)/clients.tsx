import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { clientsProgram } from "@/features/workspace/domain-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Clients"
      makeProgram={(api) => clientsProgram(api)}
      queryKey={domainKeys.list("clients")}
      screenTitle="Clients"
    />
  );
}
