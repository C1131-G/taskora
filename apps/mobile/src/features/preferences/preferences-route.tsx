import { Effect } from "effect";

import { WorkspaceErrorState } from "@/components/workspace/workspace-error-state";
import type { AppFailure } from "@/errors";
import { PreferencesScreen } from "@/features/preferences/preferences-screen";
import {
  getPreferences,
  type Preference,
  type PreferenceAudience,
} from "@/features/preferences/queries";
import { useApi, useApiQuery, useKeys } from "@/runtime/api-hooks";

const SKELETON_PREFERENCES: readonly Preference[] = [
  { channel: "in-app", enabled: true, eventType: "assignment" },
  { channel: "email", enabled: true, eventType: "assignment" },
  { channel: "in-app", enabled: true, eventType: "comment" },
  { channel: "email", enabled: true, eventType: "comment" },
  { channel: "in-app", enabled: true, eventType: "status" },
  { channel: "email", enabled: true, eventType: "status" },
];

/** Loads the person's settings, then shows the switches. */
export const PreferencesRoute = ({ audience }: { readonly audience: PreferenceAudience }) => {
  const api = useApi();
  const keys = useKeys();

  const program: Effect.Effect<readonly Preference[], AppFailure> =
    api === null ? Effect.succeed([]) : getPreferences(api, audience);

  const loaded = useApiQuery({
    enabled: api !== null,
    program,
    queryKey: ["notification-preferences", audience],
  });

  const isLoading = api === null || keys === null || loaded.isPending;
  if (loaded.error !== null) {
    return <WorkspaceErrorState failure={loaded.error} onRetry={() => void loaded.refetch()} />;
  }

  return (
    <PreferencesScreen
      api={api}
      audience={audience}
      isLoading={isLoading}
      keys={keys}
      preferences={loaded.data ?? SKELETON_PREFERENCES}
    />
  );
};
