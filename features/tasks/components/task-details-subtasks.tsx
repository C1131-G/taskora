/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";

import { Checkbox } from "@/components/ui/checkbox";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceCombobox } from "@/components/workspace/workspace-combobox";
import {
  WorkspaceInput,
  WorkspaceTextarea,
} from "@/components/workspace/workspace-controls";
import { WorkspaceDatePicker } from "@/components/workspace/workspace-date-picker";
import { WorkspaceDisclosure } from "@/components/workspace/workspace-disclosure";
import { LONG_TEXT_MAX_LENGTH } from "@/src/server/core/text-limits";

export interface TaskSubtaskView {
  readonly id: string;
  readonly taskId: string;
  readonly title: string;
  readonly description: string | null;
  readonly dueDate: string | null;
  readonly assigneeId: string | null;
  readonly position: number;
  readonly completed: boolean;
}

export const TaskSubtasksSection = ({
  subtasks,
  editable,
  pending,
  onAdd,
  onToggle,
  onRemove,
  onUpdate,
  onReorder,
  onPromote,
  employees,
}: {
  readonly subtasks: readonly TaskSubtaskView[];
  readonly editable: boolean;
  readonly pending: boolean;
  readonly onAdd: (formData: FormData) => void;
  readonly onToggle: (subtask: TaskSubtaskView) => void;
  readonly onRemove: (subtask: TaskSubtaskView) => void;
  readonly onUpdate: (subtask: TaskSubtaskView, formData: FormData) => void;
  readonly onReorder: (index: number, direction: -1 | 1) => void;
  readonly onPromote: (subtask: TaskSubtaskView) => void;
  readonly employees: readonly { readonly id: string; readonly name: string }[];
}) => (
  <section className="stack subtasks">
    <h3>
      Subtasks
      {subtasks.length > 0 ? (
        <span className="subtasks-count">
          {subtasks.filter(({ completed }) => completed).length} of{" "}
          {subtasks.length} done
        </span>
      ) : null}
    </h3>
    {subtasks.length > 0 ? (
      <div
        aria-hidden="true"
        className="subtasks-bar"
        style={{
          "--done": `${Math.round(
            (subtasks.filter(({ completed }) => completed).length /
              subtasks.length) *
              100
          )}%`,
        }}
      />
    ) : (
      <p className="subtasks-empty">
        No subtasks yet. Break this task into smaller steps you can tick off.
      </p>
    )}
    <ul className="subtasks-list">
      {subtasks.map((subtask, index) => (
        <li
          className={`subtask${subtask.completed ? " is-done" : ""}`}
          key={subtask.id}
        >
          <Checkbox
            aria-label={`Mark ${subtask.title} ${subtask.completed ? "incomplete" : "complete"}`}
            checked={subtask.completed}
            disabled={!editable || pending}
            onCheckedChange={() => onToggle(subtask)}
          />
          <span className="subtask-title">{subtask.title}</span>
          <span className={`subtask-due${subtask.dueDate ? "" : " is-empty"}`}>
            {subtask.dueDate ?? ""}
          </span>
          <span className="subtask-actions">
            {editable ? (
              <WorkspaceDisclosure
                description={`Edit the title, notes, due date, and assignee for ${subtask.title}.`}
                title={`Edit ${subtask.title}`}
                trigger={
                  <WorkspaceButton
                    aria-label={`Edit ${subtask.title}`}
                    className="ibtn ibtn-sm"
                    title="Edit subtask"
                    type="button"
                  >
                    <PencilSimple aria-hidden="true" size={15} />
                  </WorkspaceButton>
                }
              >
                <form
                  action={(formData) => onUpdate(subtask, formData)}
                  className="panel-b stack"
                >
                  <label
                    className="field"
                    htmlFor={`subtask-${subtask.id}-field-199`}
                  >
                    <span>Title</span>
                    <WorkspaceInput
                      className="input"
                      defaultValue={subtask.title}
                      maxLength={240}
                      name="title"
                      required
                      id={`subtask-${subtask.id}-field-199`}
                    />
                  </label>
                  <label
                    className="field"
                    htmlFor={`subtask-${subtask.id}-field-223`}
                  >
                    <span>Notes</span>
                    <WorkspaceTextarea
                      className="input"
                      defaultValue={subtask.description ?? ""}
                      maxLength={LONG_TEXT_MAX_LENGTH}
                      name="description"
                      rows={2}
                      id={`subtask-${subtask.id}-field-223`}
                    />
                  </label>
                  <div className="row">
                    <label
                      className="field"
                      htmlFor={`subtask-${subtask.id}-field-220`}
                    >
                      <span>Due date</span>
                      <WorkspaceDatePicker
                        className="input"
                        defaultValue={subtask.dueDate ?? ""}
                        name="dueDate"
                        id={`subtask-${subtask.id}-field-220`}
                      />
                    </label>
                    <label
                      className="field"
                      htmlFor={`subtask-${subtask.id}-field-228`}
                    >
                      <span>Assignee</span>
                      <WorkspaceCombobox
                        ariaLabel={`Choose assignee for ${subtask.title}`}
                        className="input"
                        defaultValue={subtask.assigneeId ?? ""}
                        emptyMessage="No employees found."
                        id={`subtask-${subtask.id}-field-228`}
                        key={`${subtask.id}-assignee-${subtask.assigneeId ?? "none"}`}
                        name="assigneeId"
                        options={[
                          { label: "Unassigned", value: "" },
                          ...employees.map((employee) => ({
                            label: employee.name,
                            value: employee.id,
                          })),
                        ]}
                        placeholder="Unassigned"
                        searchPlaceholder="Search employees"
                      />
                    </label>
                  </div>
                  <WorkspaceButton
                    className="btn btn-sm btn-secondary"
                    disabled={pending}
                    type="submit"
                  >
                    Save subtask
                  </WorkspaceButton>
                </form>
              </WorkspaceDisclosure>
            ) : null}
            {editable ? (
              <WorkspaceButton
                aria-label={`Move ${subtask.title} up`}
                className="ibtn ibtn-sm"
                title="Move up"
                disabled={pending || index === 0}
                onClick={() => onReorder(index, -1)}
                type="button"
              >
                <ArrowUp aria-hidden="true" size={14} />
              </WorkspaceButton>
            ) : null}
            {editable ? (
              <WorkspaceButton
                aria-label={`Move ${subtask.title} down`}
                className="ibtn ibtn-sm"
                title="Move down"
                disabled={pending || index === subtasks.length - 1}
                onClick={() => onReorder(index, 1)}
                type="button"
              >
                <ArrowDown aria-hidden="true" size={14} />
              </WorkspaceButton>
            ) : null}
            {editable ? (
              <WorkspaceButton
                aria-label={`Promote ${subtask.title} to a task`}
                className="ibtn ibtn-sm"
                disabled={pending || subtask.completed}
                onClick={() => onPromote(subtask)}
                title="Promote to its own task"
                type="button"
              >
                <ArrowUpRight aria-hidden="true" size={15} />
              </WorkspaceButton>
            ) : null}
            {editable ? (
              <WorkspaceButton
                aria-label={`Remove ${subtask.title}`}
                className="ibtn ibtn-sm subtask-remove"
                disabled={pending}
                onClick={() => onRemove(subtask)}
                title="Remove subtask"
                type="button"
              >
                <Trash aria-hidden="true" size={15} />
              </WorkspaceButton>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
    {editable ? (
      <form action={onAdd} className="subtask-add">
        <WorkspaceInput
          aria-label="New subtask title"
          className="input grow"
          maxLength={240}
          name="title"
          placeholder="Add a subtask and press Enter"
          required
        />
        <WorkspaceButton
          className="btn btn-sm btn-secondary"
          disabled={pending}
          type="submit"
        >
          <Plus aria-hidden="true" size={14} />
          Add
        </WorkspaceButton>
      </form>
    ) : null}
  </section>
);
