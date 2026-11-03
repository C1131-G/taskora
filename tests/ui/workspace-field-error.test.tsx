import { expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  WorkspaceFieldError,
  WorkspaceFormError,
} from "@/components/workspace/workspace-field-error";
import { NO_FORM_ERRORS, fieldErrorId } from "@/lib/field-errors";

const errors = {
  fields: { title: "Enter a title." },
  form: "You can't edit this event.",
};

test("a field error remains available to assistive technology without inline text", () => {
  const markup = renderToStaticMarkup(
    createElement(WorkspaceFieldError, {
      errors,
      field: "title",
      formId: "event",
    })
  );

  expect(markup).toContain('class="sr-only"');
  expect(markup).toContain(`id="${fieldErrorId("event", "title")}"`);
  expect(markup).toContain("Enter a title.");
});

test("a field without an error renders nothing", () => {
  const markup = renderToStaticMarkup(
    createElement(WorkspaceFieldError, {
      errors,
      field: "location",
      formId: "event",
    })
  );

  expect(markup).toBe("");
});

test("form level errors do not render inline", () => {
  const shown = renderToStaticMarkup(
    createElement(WorkspaceFormError, { errors })
  );
  const cleared = renderToStaticMarkup(
    createElement(WorkspaceFormError, { errors: NO_FORM_ERRORS })
  );

  expect(shown).toBe("");
  expect(cleared).toBe("");
});
