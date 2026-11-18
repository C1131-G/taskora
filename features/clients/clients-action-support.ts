import { Schema } from "effect";

import { IdempotencyKeySchema } from "@/src/server/core/input-schemas";

export const withKey = <Fields extends Schema.Struct.Fields>(
  schema: Schema.Struct<Fields>
) => Schema.Struct({ ...schema.fields, idempotencyKey: IdempotencyKeySchema });
