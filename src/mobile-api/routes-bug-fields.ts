import { Schema } from "effect";

// Shapes shared by the portal and staff bug routes.

export const Uuid = Schema.String.check(Schema.isUUID());
export const Version = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThan(0)
);
export const Text = Schema.String.check(
  Schema.isMaxLength(10_000),
  Schema.makeFilter((value) =>
    value.trim() ? undefined : "This field is required."
  )
);
export const ShortText = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(500))
);
export const Flag = Schema.Literals(["true", "false"]);

export const BugIdParams = Schema.Struct({ bugId: Uuid });
