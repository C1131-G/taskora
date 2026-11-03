"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

// One toaster for the whole app. Error messages that used to sit inline in forms
// and panels appear here instead (see ErrorToast).
const AppToaster = () => {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      closeButton
      duration={6000}
      position="bottom-right"
      richColors
      theme={resolvedTheme === "light" ? "light" : "dark"}
      toastOptions={{ classNames: { toast: "app-toast" } }}
    />
  );
};

export { AppToaster };
