"use client";

import { isValidElement, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormReset } from "@/components/workspace/use-form-reset";

const EMPTY_VALUE = "__taskora_empty_select_value__";

const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
};

// The label of the selected item, read from the item elements themselves. The
// select renders it on the server too, so the closed control shows its value from the
// first paint instead of staying blank until the page has hydrated.
const labelOfSelected = (
  children: ReactNode,
  selected: string
): string | undefined => {
  let found: string | undefined;
  const visit = (node: ReactNode) => {
    for (const child of Array.isArray(node) ? node : [node]) {
      if (
        found !== undefined ||
        !isValidElement<{ children?: ReactNode; value?: unknown }>(child)
      ) {
        continue;
      }
      const { props } = child;
      if (typeof props.value === "string") {
        if ((props.value || EMPTY_VALUE) === selected) {
          found = textOf(props.children).trim() || undefined;
        }
      } else {
        visit(props.children);
      }
    }
  };
  visit(children);
  return found;
};

const WorkspaceSelect = ({
  ariaInvalid,
  ariaDescribedby,
  ariaLabel,
  children,
  className,
  defaultValue,
  dataField,
  disabled,
  displayValue,
  id,
  name,
  onValueChange,
  required,
  status,
  value,
}: {
  readonly ariaInvalid?: boolean | "false" | "grammar" | "spelling" | "true";
  readonly ariaDescribedby?: string;
  readonly ariaLabel?: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly defaultValue?: string;
  readonly dataField?: string;
  readonly disabled?: boolean;
  readonly displayValue?: string | undefined;
  readonly id?: string;
  readonly name?: string;
  readonly onValueChange?: (value: string) => void;
  readonly required?: boolean;
  readonly status?: "backlog" | "todo" | "progress" | "review" | "done";
  readonly value?: string;
}) => {
  const initialValue = value ?? defaultValue ?? "";
  const [selectedValue, setSelectedValue] = useState(
    initialValue || EMPTY_VALUE
  );
  const formInput = useRef<HTMLInputElement>(null);

  useFormReset(formInput, () => setSelectedValue(initialValue || EMPTY_VALUE));

  const currentValue =
    value === undefined ? selectedValue : value || EMPTY_VALUE;
  return (
    <>
      <Select
        {...(disabled === undefined ? {} : { disabled })}
        {...(required === undefined ? {} : { required })}
        onValueChange={(nextValue) => {
          if (value === undefined) {
            setSelectedValue(nextValue);
          }
          onValueChange?.(nextValue === EMPTY_VALUE ? "" : nextValue);
        }}
        value={currentValue}
      >
        <SelectTrigger
          aria-describedby={ariaDescribedby}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-required={required || undefined}
          className={className}
          data-field={dataField}
          data-status={status}
          id={id}
        >
          <SelectValue>
            {displayValue ?? labelOfSelected(children, currentValue)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent data-workspace-select="">{children}</SelectContent>
      </Select>
      {name ? (
        <input
          disabled={disabled}
          name={name}
          ref={formInput}
          type="hidden"
          value={currentValue === EMPTY_VALUE ? "" : currentValue}
        />
      ) : null}
    </>
  );
};

const WorkspaceSelectItem = ({
  children,
  value,
  ...props
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly value: string;
}) => (
  <SelectItem value={value || EMPTY_VALUE} {...props}>
    {children}
  </SelectItem>
);

export { WorkspaceSelect, WorkspaceSelectItem };
