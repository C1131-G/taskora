/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

import { ErrorToast } from "@/components/workspace/error-toast";

export const TaskPanelError = ({
  message,
  onRetry,
  revision,
}: {
  readonly loading: boolean;
  readonly message: string | null;
  readonly onRetry: () => void;
  readonly revision: number;
}) => (
  <ErrorToast
    action={{ label: "Retry", onClick: onRetry }}
    message={message}
    resetKey={revision}
  />
);
