"use client";

import { startTransition, useActionState } from "react";

type Submit = () => Promise<void> | void;

// A form submit as a React action: `useActionState` owns the pending flag and
// runs submits one after another. The handler dispatches it by hand instead of
// through `<form action>`, so React keeps the fields as typed when the server
// rejects them (a form action would reset every uncontrolled field).
export const useActionTransition = () => {
  const [, dispatch, pending] = useActionState(
    async (_previous: null, submit: Submit): Promise<null> => {
      await submit();
      return null;
    },
    null
  );
  const run = (submit: Submit): void => {
    startTransition(() => {
      dispatch(submit);
    });
  };
  return [pending, run] as const;
};
