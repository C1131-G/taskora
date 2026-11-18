import { Schema } from "effect";

export const IdSchema = Schema.String.check(Schema.isUUID());

export const SubtaskSchema = Schema.Struct({
  assigneeId: Schema.NullOr(Schema.String),
  completed: Schema.Boolean,
  description: Schema.NullOr(Schema.String),
  dueDate: Schema.NullOr(Schema.String),
  id: Schema.String,
  position: Schema.Number,
  taskId: Schema.String,
  title: Schema.String,
});

export const TaskPathSchema = Schema.Struct({ taskId: IdSchema });

export const CalendarDayText = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u)
);

export const ExpectedVersionSchema = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(1)
);
