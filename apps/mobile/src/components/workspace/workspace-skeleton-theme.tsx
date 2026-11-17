import type { ReactNode } from "react";
import { SkeletonTheme } from "react-zero-skeleton";

import { useTheme } from "@/theme/theme-provider";
import { theme } from "@/theme/tokens.generated";

/**
 * Colors every Skelter bone from the active palette instead of the library's
 * light-only grey, and fades the bones out over the arriving content.
 * Skelter drops its pulse itself under reduced motion.
 */
export const WorkspaceSkeletonTheme = ({ children }: { readonly children: ReactNode }) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <SkeletonTheme
      color={palette.surface3}
      exit="fade"
      highlightColor={palette.surface2}
      revealOnExit
    >
      {children}
    </SkeletonTheme>
  );
};
