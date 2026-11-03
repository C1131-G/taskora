import { expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { NotFoundState } from "@/components/ui/not-found-state";
import { PageErrorState } from "@/components/ui/page-error-state";

test("page errors offer retry and the correct home destination", () => {
  const markup = renderToStaticMarkup(
    createElement(PageErrorState, {
      homeHref: "/portal",
      retry: () => null,
      title: "Portal unavailable",
      variant: "page",
    })
  );

  expect(markup).toContain('aria-label="Page recovery"');
  expect(markup).not.toContain("Portal unavailable");
  expect(markup).toContain("Try again");
  expect(markup).toContain('href="/portal"');
});

test("section errors keep retry available without inline error text", () => {
  const markup = renderToStaticMarkup(
    createElement(PageErrorState, {
      retry: () => null,
      title: "Projects couldn't load",
    })
  );

  expect(markup).toContain('aria-label="Section recovery"');
  expect(markup).not.toContain("Projects couldn");
  expect(markup).toContain("Try again");
  expect(markup).not.toContain("Go to home");
});

test("not found states give a useful destination without a retry action", () => {
  const markup = renderToStaticMarkup(
    createElement(NotFoundState, {
      description: "The project may have been removed.",
      href: "/projects",
      linkText: "Go to projects",
      title: "Project not found",
    })
  );

  expect(markup).not.toContain("Project not found");
  expect(markup).toContain('href="/projects"');
  expect(markup).toContain("Go to projects");
  expect(markup).not.toContain("Try again");
});
