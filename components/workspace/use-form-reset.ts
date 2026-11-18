"use client";

import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";

// Native form reset does not reach controlled React state, so custom controls
// listen for the owning form's "reset" event and restore their own value.
export const useFormReset = (
  inputRef: RefObject<HTMLInputElement | null>,
  onReset: () => void
) => {
  const restoreValue = useEffectEvent(onReset);

  useEffect(
    function listenForFormReset() {
      const form = inputRef.current?.form;
      if (!form) {
        return;
      }
      const handleReset = () => {
        restoreValue();
      };
      form.addEventListener("reset", handleReset);
      return function stopListeningForFormReset() {
        form.removeEventListener("reset", handleReset);
      };
    },
    [inputRef]
  );
};
