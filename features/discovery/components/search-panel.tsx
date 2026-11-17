/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { ErrorToast } from "@/components/workspace/error-toast";
import { SearchForm } from "@/features/discovery/components/search-form";
import {
  getPersonalWorkspace,
  getWorkspaceSearchResults,
} from "@/features/discovery/discovery-queries";

const SearchPanel = async ({
  initialQuery,
}: {
  readonly initialQuery: string;
}) => {
  const [workspace, search] = await Promise.all([
    getPersonalWorkspace({}),
    initialQuery.trim()
      ? getWorkspaceSearchResults({ query: initialQuery })
      : Promise.resolve(null),
  ]);
  return (
    <>
      <ErrorToast message={workspace.ok ? null : workspace.error.message} />
      <SearchForm
        initialResults={search?.ok ? search.data : null}
        initialError={search && !search.ok ? search.error.message : null}
        key={initialQuery}
        recentSearches={workspace.ok ? workspace.data.recentSearches : []}
      />
    </>
  );
};

export { SearchPanel };
