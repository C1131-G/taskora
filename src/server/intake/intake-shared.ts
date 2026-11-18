import { randomBytes } from "node:crypto";

import { AppError } from "../core/action-result";

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const REFERENCE_LENGTH = 8;

export const ACTUAL_BEHAVIOR_LENGTH = 2000;

// The same words for an unknown slug, a disabled form and a deactivated
// company, so a probe learns nothing about which forms exist.
export const unavailable = () =>
  new AppError({
    code: "NOT_FOUND",
    message: "This form is not available.",
  });

export interface IntakeReceipt {
  readonly referenceId: string;
}

export const newReferenceId = (): string => {
  const bytes = randomBytes(REFERENCE_LENGTH);
  const code = [...bytes]
    .map((byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length])
    .join("");
  return `INT-${code}`;
};
