"use client";

/* eslint-disable shadcn/no-restyle */

/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";

import type { Option } from "./automation-option-helpers";
import { displayProps } from "./automation-option-helpers";

export const OptionSelect = ({
  ariaLabel,
  disabled,
  onChange,
  options,
  placeholder,
  value,
}: {
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
  readonly options: readonly Option[];
  readonly placeholder?: string;
  readonly value: string;
}) => (
  <WorkspaceSelect
    ariaLabel={ariaLabel}
    className="input"
    disabled={disabled}
    {...displayProps(options, value, placeholder)}
    onValueChange={onChange}
    value={value}
  >
    {options.map((option) => (
      <WorkspaceSelectItem key={option.id} value={option.id}>
        {option.label}
      </WorkspaceSelectItem>
    ))}
  </WorkspaceSelect>
);
