import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as RouterThemeProvider,
} from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Effect } from "effect";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ErrorToastProvider, ErrorToastViewport } from "@/components/workspace/error-toast-provider";
import { useErrorToast } from "@/components/workspace/error-toast-context";
import { ErrorBoundary } from "@/components/workspace/route-error-boundary";
import { usePrefersReducedMotion } from "@/components/workspace/workspace-reveal-gate";
import { WorkspaceSkeletonTheme } from "@/components/workspace/workspace-skeleton-theme";

import { SessionGate } from "@/features/auth/session-gate";
import { OfflineBanner } from "@/features/connectivity/offline-banner";
import { makeQueryClient } from "@/runtime/query-client";
import { appRuntime } from "@/runtime/runtime";
import { loadAppFonts } from "@/theme/fonts";
import { ThemeProvider, useTheme } from "@/theme/theme-provider";

// 30 s staleTime, transient-only retries; background-refresh failures are
// toasted by the session gate, which sits inside the toast provider.
const queryClient = makeQueryClient();

export { ErrorBoundary };
export const unstable_settings = { screenErrorBoundary: ErrorBoundary };

const FontLoader = () => {
  const showError = useErrorToast();
  useEffect(
    function loadFontsIntoNativeRegistry() {
      void appRuntime().runPromiseExit(Effect.catchEager(loadAppFonts, () =>
        Effect.sync(() => showError("Could not load the app fonts. Using the system font.")),
      ));
    },
    [showError],
  );
  return null;
};

const RoutedStack = () => {
  const { isDark } = useTheme();
  const reducedMotion = usePrefersReducedMotion();

  // The status bar follows the app theme, which can differ from the system one.
  return (
    <RouterThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ animation: reducedMotion ? "fade" : "default", headerShown: false }} />
    </RouterThemeProvider>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
    <QueryClientProvider client={queryClient}>
      <ErrorToastProvider renderViewport={false}>
        <ThemeProvider>
          <FontLoader />
          <WorkspaceSkeletonTheme>
            <SessionGate>
              <OfflineBanner />
              <RoutedStack />
            </SessionGate>
          </WorkspaceSkeletonTheme>
          <ErrorToastViewport />
        </ThemeProvider>
      </ErrorToastProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
