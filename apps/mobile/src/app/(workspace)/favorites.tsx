import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { favoritesProgram } from "@/features/workspace/domain-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Favorites"
      makeProgram={(api) => favoritesProgram(api)}
      queryKey={domainKeys.list("favorites")}
      screenTitle="Favorites"
    />
  );
}
