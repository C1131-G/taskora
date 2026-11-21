/* eslint-disable shadcn/no-unknown-classes -- Public intake screens reuse the auth chrome styles. */

const REFERENCE_PATTERN = /^INT-[A-Z0-9]{8}$/u;

// The reference comes from the address bar, so only the exact shape is shown.
const ReferenceNote = ({ reference }: { readonly reference: unknown }) =>
  typeof reference === "string" && REFERENCE_PATTERN.test(reference) ? (
    <p className="auth-foot-note">
      Your reference is{" "}
      <strong data-testid="intake-reference">{reference}</strong>. Quote it if
      you contact us about this report.
    </p>
  ) : null;

// The note wraps to two lines in the card, so the fallback holds two.
const ReferenceNoteSkeleton = () => (
  <output
    aria-busy="true"
    aria-label="Loading your report reference"
    className="auth-foot-note block"
  >
    <span className="sr-only">Loading your report reference</span>
    <span aria-hidden="true" className="auth-skeleton-text" />
    <span aria-hidden="true" className="auth-skeleton-text" />
  </output>
);

export { ReferenceNote, ReferenceNoteSkeleton };
