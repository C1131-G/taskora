"use client";

import { useEffect } from "react";

// Long enough for the last staggered region (up to about 620ms) to finish fading in.
const REVEAL_WINDOW_MS = 650;

// The page-load reveal plays on first paint only. Once its window passes, the
// document is marked so pages mounted by later navigations render solid.
export const WorkspaceRevealGate = () => {
  useEffect(function markRevealWindowEnd() {
    const markRevealed = () => {
      document.documentElement.dataset["workspaceRevealed"] = "";
    };
    const timer = window.setTimeout(markRevealed, REVEAL_WINDOW_MS);
    return function cancelRevealMark() {
      window.clearTimeout(timer);
    };
  }, []);
  return null;
};
