import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as RouterThemeProvider,
} from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Effect } from "effect";
import { useEffect } from "react";

import { ErrorToastProvider, ErrorToastViewport } from "@/components/workspace/error-toast-provider";
import { useErrorToast } from "@/components/workspace/error-toast-context";
import { ErrorBoundary } from "@/components/workspace/route-error-boundary";
import { WorkspaceSkeletonTheme } from "@/components/workspace/workspace-skeleton-theme";

import { SessionGate } from "@/features/auth/session-gate";
import { OfflineBanner } from "@/features/connectivity/offline-banner";
import { appRuntime } from "@/runtime/runtime";
import { loadAppFonts } from "@/theme/fonts";
import { ThemeProvider, useTheme } from "@/theme/theme-provider";

const queryClient = new QueryClient();

export { ErrorBoundary };
export const unstable_settings = { screenErrorBoundary: ErrorBoundary };

const FontLoader = () => {
  const showError = useErrorToast();
  useEffect(() => {
    void appRuntime().runPromiseExit(Effect.catchEager(loadAppFonts, () =>
      Effect.sync(() => showError("Could not load the app fonts. Using the system font.")),
    ));
  }, [showError]);
  return null;
};

const RoutedStack = () => {
  const { isDark } = useTheme();

  return (
    <RouterThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </RouterThemeProvider>
  );
};

export default function RootLayout() {
  return (
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
  );
}
