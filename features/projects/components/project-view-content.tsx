/* eslint-disable shadcn/no-unknown-classes -- Project views use reference workspace styles. */

import { projectViewRenderers } from "./project-view-renderers";
import type { ProjectViewContentProps } from "./project-view-shared";

export const ProjectViewContent = (props: ProjectViewContentProps) =>
  projectViewRenderers[props.view]?.(props) ?? null;
