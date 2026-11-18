/* eslint-disable shadcn/no-restyle -- Preserve established portal classes on shared controls. */

/* eslint-disable shadcn/no-unknown-classes -- Portal pages reuse the workspace stylesheet classes. */

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import {
  BehaviorFields,
  StepsField,
  SummaryFields,
} from "@/features/portal/components/portal-bug-fields";
import type {
  Errors,
  Values,
} from "@/features/portal/components/portal-bug-form-model";
import {
  EnvironmentFields,
  ImpactField,
  PageUrlField,
} from "@/features/portal/components/portal-environment-fields";
import type { parseEnvironment } from "@/features/portal/portal-environment";

export const PortalBugEditFields = ({
  detected,
  errors,
  onAddStep,
  onPatch,
  onRemoveStep,
  onStepChange,
  pending,
  values,
}: {
  readonly detected: ReturnType<typeof parseEnvironment>;
  readonly errors: Errors;
  readonly onAddStep: () => void;
  readonly onPatch: (patch: Partial<Values>) => void;
  readonly onRemoveStep: (id: string) => void;
  readonly onStepChange: (id: string, text: string) => void;
  readonly pending: boolean;
  readonly values: Values;
}) => (
  <>
    <SummaryFields
      errors={errors}
      onPatch={onPatch}
      pending={pending}
      values={values}
    />
    <StepsField
      errors={errors}
      onAdd={onAddStep}
      onRemove={onRemoveStep}
      onStepChange={onStepChange}
      pending={pending}
      steps={values.steps}
    />
    <BehaviorFields
      errors={errors}
      onPatch={onPatch}
      pending={pending}
      values={values}
    />
    <PageUrlField
      errors={errors}
      onPatch={onPatch}
      pending={pending}
      value={values.pageUrl}
    />
    <ImpactField
      errors={errors}
      onPatch={onPatch}
      pending={pending}
      value={values.impact}
    />
    <EnvironmentFields
      detected={detected}
      isCreate={false}
      onPatch={onPatch}
      pending={pending}
      values={values}
    />
  </>
);

export const PortalBugEditActions = ({
  onCancel,
  pending,
  submitText,
}: {
  readonly onCancel: () => void;
  readonly pending: boolean;
  readonly submitText: string;
}) => (
  <div className="portal-form-acts">
    <WorkspaceButton
      className="btn btn-primary"
      disabled={pending}
      type="submit"
    >
      {submitText}
    </WorkspaceButton>
    <WorkspaceButton
      className="btn btn-ghost"
      disabled={pending}
      onClick={onCancel}
      type="button"
    >
      Cancel
    </WorkspaceButton>
  </div>
);
