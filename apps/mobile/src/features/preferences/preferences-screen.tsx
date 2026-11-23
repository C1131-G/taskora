import { Effect } from "effect";
import { useRef, useState } from "react";
import { withSkeleton } from "react-zero-skeleton";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { WorkspaceEmptyState } from "@/components/workspace/workspace-empty-state";
import { WorkspaceListGroup } from "@/components/workspace/workspace-list-row";
import { WorkspaceLoadingRegion } from "@/components/workspace/workspace-loading";
import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { useErrorToast } from "@/components/workspace/error-toast-context";
import { failureMessage } from "@/components/workspace/workspace-error-state";
import {
  CHANNEL_LABELS,
  EVENT_LABELS,
  groupByEvent,
  setPreference,
  type Preference,
  type PreferenceAudience,
} from "@/features/preferences/queries";
import { useApiMutation, type ApiContextValue, type KeysContextValue } from "@/runtime/api-hooks";
import { preferenceKeys } from "@/runtime/query-keys";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, spacing, theme } from "@/theme/tokens.generated";

export interface PreferencesScreenProps {
  /** Null while the session restores; the screen then only renders its skeleton. */
  readonly api: ApiContextValue | null;
  readonly audience: PreferenceAudience;
  readonly keys: KeysContextValue | null;
  readonly preferences: readonly Preference[];
}

interface PreferenceWrite {
  readonly cell: string;
  readonly next: boolean;
  readonly preference: Preference;
}

const cellOf = (preference: Preference): string => `${preference.eventType}:${preference.channel}`;

/**
 * Which notifications reach the person, per kind and channel. A switch shows
 * its new state at once and goes back if the server refuses the change. One
 * write per switch at a time: taps on a switch whose write is still in flight
 * are ignored, so writes cannot land out of order or share an intent key.
 */
const PreferencesContent = ({ api, audience, keys, preferences }: PreferencesScreenProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const [shown, setShown] = useState<Readonly<Record<string, boolean>>>({});
  // The guard is a ref so two taps inside one render cannot both pass it.
  const inFlight = useRef(new Set<string>());
  const showError = useErrorToast();
  // Hook-level callbacks: switches write independently, and per-call `mutate`
  // callbacks only fire for the latest call. The cell is released and its
  // optimistic state dropped only after the refresh, so a switch never stays locked.
  const { mutate } = useApiMutation<PreferenceWrite, unknown>({
    invalidates: [preferenceKeys.forAudience(audience)],
    mutationKey: [...preferenceKeys.forAudience(audience), "write"],
    onError: (failure) =>
      showError(failure === undefined ? "Could not save notification settings." : failureMessage(failure)),
    onSettled: ({ cell }) => {
      inFlight.current.delete(cell);
      setShown((current) => {
        const { [cell]: _settled, ...rest } = current;
        return rest;
      });
    },
    program: ({ next, preference }) =>
      keys === null || api === null
        ? Effect.void
        : keys.run(`preference-${cellOf(preference)}-${String(next)}`, (key) =>
            setPreference(api, key, audience, { ...preference, enabled: next }),
          ),
  });

  const toggle = (preference: Preference): void => {
    if (api === null || keys === null) return;
    const cell = cellOf(preference);
    if (inFlight.current.has(cell)) return;
    inFlight.current.add(cell);
    const next = !(shown[cell] ?? preference.enabled);
    setShown((current) => ({ ...current, [cell]: next }));
    mutate({ cell, next, preference });
  };

  const groups = groupByEvent(preferences);

  return groups.length === 0 ? (
    <WorkspaceEmptyState message="There is nothing to switch on or off." title="No settings" />
  ) : (
    <View style={styles.list}>
      {groups.map((group) => (
        <WorkspaceListGroup key={group.eventType} label={EVENT_LABELS[group.eventType]}>
          {group.rows.map((preference) => {
            const pending = shown[cellOf(preference)];
            const enabled = pending ?? preference.enabled;
            return (
              <Pressable
                accessibilityLabel={`${EVENT_LABELS[preference.eventType]}: ${CHANNEL_LABELS[preference.channel]}`}
                accessibilityRole="switch"
                accessibilityState={{ busy: pending !== undefined, checked: enabled }}
                key={cellOf(preference)}
                onPress={() => toggle(preference)}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: pressed ? palette.surface2 : "transparent" },
                ]}
              >
                <Text style={[typeStyle("md"), { color: palette.text }]}>
                  {CHANNEL_LABELS[preference.channel]}
                </Text>
                <Text
                  style={[
                    typeStyle("sm", { weight: 600 }),
                    { color: enabled ? palette.accent : palette.text3 },
                  ]}
                >
                  {enabled ? "On" : "Off"}
                </Text>
              </Pressable>
            );
          })}
        </WorkspaceListGroup>
      ))}
    </View>
  );
};

const SkelterPreferencesContent = withSkeleton(PreferencesContent);

/** The notification settings screen; the frame and title stay real while the switches load. */
export const PreferencesScreen = ({
  isLoading,
  ...props
}: PreferencesScreenProps & { readonly isLoading: boolean }) => (
  <WorkspaceScreen title="Notifications">
    <WorkspaceLoadingRegion isLoading={isLoading} label="Loading notification settings">
      <SkelterPreferencesContent hasSkeleton={isLoading} isLoading={isLoading} {...props} />
    </WorkspaceLoadingRegion>
  </WorkspaceScreen>
);

const styles = StyleSheet.create({
  list: {
    gap: spacing.s5,
  },
  row: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.s3,
  },
});
