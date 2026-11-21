import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { myTimeProgram } from "@/features/workspace/domain-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="My Time"
      makeProgram={(api) => myTimeProgram(api)}
      queryKey={domainKeys.list("my-time")}
      screenTitle="My Time"
    />
  );
}
