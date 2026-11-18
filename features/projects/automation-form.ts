import type {
  AutomationRuleInput,
  AutomationRuleSummary,
} from "@/src/server/automation/automation-contracts";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/src/server/automation/automation-model";
import type {
  ActionType,
  AutomationAction,
  AutomationCondition,
  AutomationTrigger,
  ConditionField,
  ConditionOp,
} from "@/src/server/automation/automation-model";

// The builder edits plain strings; this module turns them into the typed
// rule the server validates, and turns stored rules back into words.

export interface ConditionDraft {
  readonly key: string;
  readonly field: ConditionField;
  readonly op: ConditionOp;
  readonly values: readonly string[];
}

export interface ActionDraft {
  readonly key: string;
  readonly type: ActionType;
  readonly status: string;
  readonly priority: string;
  readonly userId: string;
  readonly labelId: string;
  readonly body: string;
  readonly message: string;
}

export interface RuleDraft {
  readonly name: string;
  readonly trigger: AutomationTrigger;
  readonly conditions: readonly ConditionDraft[];
  readonly actions: readonly ActionDraft[];
}

export const ACTION_TYPE_LABELS: Readonly<Record<ActionType, string>> = {
  add_label: "Add a label",
  assign: "Assign a person",
  notify: "Notify a person",
  post_comment: "Post an internal comment",
  set_priority: "Set the priority",
  set_status: "Set the status",
  unassign: "Unassign a person",
};

let draftCounter = 0;

export const nextDraftKey = (prefix: string): string => {
  draftCounter += 1;
  return `${prefix}-${draftCounter}`;
};

export const emptyActionDraft = (type: ActionType): ActionDraft => ({
  body: "",
  key: nextDraftKey("action"),
  labelId: "",
  message: "",
  priority: "medium",
  status: "todo",
  type,
  userId: "",
});

export const emptyConditionDraft = (): ConditionDraft => ({
  field: "status",
  key: nextDraftKey("condition"),
  op: "in",
  values: [],
});

export const emptyRuleDraft = (): RuleDraft => ({
  actions: [],
  conditions: [],
  name: "",
  trigger: "task_created",
});

const actionToDraft = (action: AutomationAction): ActionDraft => {
  const base = emptyActionDraft(action.type);
  switch (action.type) {
    case "set_status": {
      return { ...base, status: action.status };
    }
    case "set_priority": {
      return { ...base, priority: action.priority };
    }
    case "assign":
    case "unassign": {
      return { ...base, userId: action.userId };
    }
    case "add_label": {
      return { ...base, labelId: action.labelId };
    }
    case "post_comment": {
      return { ...base, body: action.body };
    }
    case "notify": {
      return { ...base, message: action.message, userId: action.userId };
    }
    default: {
      const unhandled: never = action;
      return unhandled;
    }
  }
};

export const ruleToDraft = (rule: AutomationRuleSummary): RuleDraft => ({
  actions: rule.actions.map(actionToDraft),
  conditions: rule.conditions.map((condition) => ({
    ...condition,
    key: nextDraftKey("condition"),
  })),
  name: rule.name,
  trigger: rule.trigger,
});

export type DraftResult =
  | { readonly ok: true; readonly input: AutomationRuleInput }
  | { readonly ok: false; readonly message: string };

const fail = (message: string): DraftResult => ({ message, ok: false });

const actionFromDraft = (draft: ActionDraft): AutomationAction | null => {
  switch (draft.type) {
    case "set_status": {
      const status = TASK_STATUSES.find((value) => value === draft.status);
      return status ? { status, type: "set_status" } : null;
    }
    case "set_priority": {
      const priority = TASK_PRIORITIES.find(
        (value) => value === draft.priority
      );
      return priority ? { priority, type: "set_priority" } : null;
    }
    case "assign":
    case "unassign": {
      return draft.userId ? { type: draft.type, userId: draft.userId } : null;
    }
    case "add_label": {
      return draft.labelId
        ? { labelId: draft.labelId, type: "add_label" }
        : null;
    }
    case "post_comment": {
      return draft.body.trim()
        ? { body: draft.body.trim(), type: "post_comment" }
        : null;
    }
    case "notify": {
      return draft.userId && draft.message.trim()
        ? {
            message: draft.message.trim(),
            type: "notify",
            userId: draft.userId,
          }
        : null;
    }
    default: {
      return null;
    }
  }
};

const MISSING_ACTION_MESSAGES: Readonly<Record<ActionType, string>> = {
  add_label: "Choose a label for every add label action.",
  assign: "Choose a person for every assign action.",
  notify: "Choose a person and write a message for every notify action.",
  post_comment: "Write the comment for every comment action.",
  set_priority: "Choose a priority for every set priority action.",
  set_status: "Choose a status for every set status action.",
  unassign: "Choose a person for every unassign action.",
};

export const draftToRuleInput = (draft: RuleDraft): DraftResult => {
  const name = draft.name.trim();
  if (!name) {
    return fail("Enter a name for the automation.");
  }
  if (draft.actions.length === 0) {
    return fail("Add at least one action.");
  }
  if (draft.conditions.some(({ values }) => values.length === 0)) {
    return fail("Choose at least one value for every condition.");
  }
  const actions: AutomationAction[] = [];
  for (const actionDraft of draft.actions) {
    const action = actionFromDraft(actionDraft);
    if (!action) {
      return fail(MISSING_ACTION_MESSAGES[actionDraft.type]);
    }
    actions.push(action);
  }
  const conditions: AutomationCondition[] = draft.conditions.map(
    ({ field, op, values }) => ({ field, op, values: [...values] })
  );
  return {
    input: { actions, conditions, name, trigger: draft.trigger },
    ok: true,
  };
};
