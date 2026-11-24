import { Schema } from "effect";

import { TaskPrioritySchema, TaskStatusSchema } from "../work/work-contracts";

const SavedViewSortSchema = Schema.Struct({
  direction: Schema.Literals(["asc", "desc"]),
  field: Schema.Literals(["manual", "name", "due", "priority"]),
});

const SavedViewFiltersSchema = Schema.Struct({
  priority: Schema.Array(TaskPrioritySchema).check(Schema.isMaxLength(5)),
  query: Schema.String.check(Schema.isMaxLength(200)),
  status: Schema.Array(TaskStatusSchema).check(Schema.isMaxLength(5)),
});

const SavedViewGroupBySchema = Schema.NullOr(
  Schema.Literals(["none", "status"])
);

export type SavedViewSort = typeof SavedViewSortSchema.Type;
export type SavedViewFilters = typeof SavedViewFiltersSchema.Type;
export type SavedViewGroupBy = typeof SavedViewGroupBySchema.Type;
