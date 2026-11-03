/* eslint-disable shadcn/no-unknown-classes -- Auth screens are styled by features/user/styles/*.css. */

// Always rendered so the alert region exists before a message arrives.
const AuthAlert = ({
  id,
  message,
}: {
  readonly id: string;
  readonly message: string;
}) => (
  <p className="sr-only" id={id}>
    {message}
  </p>
);

export { AuthAlert };
