"use client";

import { useEffect } from "react";
import { toast } from "sonner";

// Native constraints still prevent submission, while their messages use the
// same error presentation as server-side validation.
export const ClientErrorToasts = () => {
  useEffect(function reportBrowserErrorsAsToasts() {
    let firstInvalid: HTMLElement | null = null;
    let focusTimer: number | undefined;
    const reportInvalid = (event: Event) => {
      const field = event.target;
      if (
        !(
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        )
      ) {
        return;
      }
      event.preventDefault();
      const label =
        field.labels?.[0]?.textContent?.trim() ||
        field.getAttribute("aria-label") ||
        field.name;
      toast.error(
        label ? `${label}: ${field.validationMessage}` : field.validationMessage
      );
      if (!firstInvalid) {
        firstInvalid = field;
        focusTimer = window.setTimeout(() => {
          firstInvalid?.focus();
          firstInvalid = null;
          focusTimer = undefined;
        }, 0);
      }
    };
    const reportUnhandledRejection = () => {
      toast.error("Something went wrong. Please try again.", {
        id: "unexpected-request-failure",
      });
    };
    document.addEventListener("invalid", reportInvalid, true);
    window.addEventListener("unhandledrejection", reportUnhandledRejection);
    return function stopReportingBrowserErrors() {
      document.removeEventListener("invalid", reportInvalid, true);
      window.removeEventListener(
        "unhandledrejection",
        reportUnhandledRejection
      );
      window.clearTimeout(focusTimer);
    };
  }, []);
  return null;
};
