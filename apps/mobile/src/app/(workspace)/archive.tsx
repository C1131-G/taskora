import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { archiveProgram } from "@/features/workspace/domain-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Archive"
      makeProgram={(api) => archiveProgram(api)}
      queryKey={domainKeys.list("archive")}
      screenTitle="Archive"
    />
  );
}
