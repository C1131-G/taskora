"use client";

/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle */

import { FolderOpen, MagnifyingGlass } from "@phosphor-icons/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  readViewer,
  useIsMac,
  useWorkspaceShortcuts,
} from "@/components/workspace/use-workspace-shortcuts";
import type {
  Viewer,
  WorkspaceCommand,
} from "@/components/workspace/workspace-command-types";
import {
  getAvailableCommands,
  getPaletteToggleKeys,
} from "@/components/workspace/workspace-commands";
import { getNavigationTransitionType } from "@/components/workspace/workspace-navigation-data";
import {
  ShortcutKeys,
  WorkspaceShortcutsHelp,
} from "@/components/workspace/workspace-shortcuts-help";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";

import type { TaskControlId } from "./workspace-palette-config";
import {
  COMMAND_ICONS,
  GO_TO_PREFIX,
  focusTaskControl,
  isPageShortcut,
  isTaskControlId,
  listedHrefs,
  pages,
} from "./workspace-palette-config";

const WorkspaceSearchPalette = ({
  projects,
  role,
}: {
  readonly projects: readonly {
    readonly color: string;
    readonly icon: string;
    readonly id: string;
    readonly name: string;
  }[];
  readonly role: Viewer["role"];
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskDrawer, setTaskDrawer] = useState<Viewer["taskDrawer"]>("none");
  // A task action picked in the palette focuses its control once the palette
  // has handed focus back, so the dialog's own restore does not win.
  const pendingFocus = useRef<TaskControlId | null>(null);
  const isMac = useIsMac();
  const base = { canCreateTask: projects.length > 0, role };
  const viewer: Viewer = { ...base, taskDrawer };
  const commands = getAvailableCommands(viewer);
  const keysByHref = new Map(
    commands.flatMap(({ href, keys }) =>
      href && keys.length > 0 ? [[href, keys] as const] : []
    )
  );
  // Pages the viewer may open that the fixed list above does not carry.
  const extraPages = commands.filter(
    (command) =>
      command.href !== undefined &&
      isPageShortcut(command) &&
      !listedHrefs.has(command.href)
  );
  const toggleKeys = getPaletteToggleKeys(isMac);

  const openPalette = () => {
    setTaskDrawer(readViewer(base).taskDrawer);
    setOpen(true);
  };

  const navigate = <Href extends string>(href: Route<Href>) => {
    setOpen(false);
    setQuery("");
    router.push(href, {
      transitionTypes: [getNavigationTransitionType(pathname, href)],
    });
  };

  const run = (command: WorkspaceCommand) => {
    if (command.href) {
      navigate(command.href);
      return;
    }
    setOpen(false);
    setQuery("");
    if (command.id === "create-task") {
      setTaskFormOpen(true);
    } else if (command.id === "show-shortcuts") {
      setHelpOpen(true);
    } else if (isTaskControlId(command.id)) {
      if (open) {
        pendingFocus.current = command.id;
      } else {
        focusTaskControl(command.id);
      }
    }
  };

  useWorkspaceShortcuts({
    base,
    isMac,
    onRun: run,
    onTogglePalette: () => (open ? setOpen(false) : openPalette()),
  });

  const commandGroups = (["Actions", "Help"] as const).map((group) => ({
    commands: commands.filter(
      (command) => command.group === group && !isPageShortcut(command)
    ),
    group,
  }));

  return (
    <>
      <Button
        aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
        aria-label="Search and jump to a page or project"
        className="topsearch"
        data-workspace-search-trigger=""
        onClick={openPalette}
        type="button"
        variant="outline"
      >
        <MagnifyingGlass aria-hidden="true" size={14} />
        <span className="lbltxt">Search or jump to…</span>
        <kbd className="kbd">{toggleKeys.join(" ")}</kbd>
      </Button>
      <CommandDialog
        className="palette-dialog"
        description="Search workspace pages and projects, run a command, or open workspace search."
        onCloseAutoFocus={(event) => {
          const pending = pendingFocus.current;
          pendingFocus.current = null;
          if (pending) {
            event.preventDefault();
            focusTaskControl(pending);
          }
        }}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setQuery("");
          }
        }}
        open={open}
        title="Search or jump to"
        workspace
      >
        <Command>
          <CommandInput
            onValueChange={setQuery}
            placeholder="Search commands, pages and projects…"
            value={query}
          />
          <CommandList>
            <CommandEmpty>
              No matching commands, pages or projects.
            </CommandEmpty>
            {commandGroups.map(({ commands: groupCommands, group }) =>
              groupCommands.length ? (
                <CommandGroup heading={group} key={group}>
                  {groupCommands.map((command) => {
                    const Icon = COMMAND_ICONS[command.id];
                    return (
                      <CommandItem
                        key={command.id}
                        onSelect={() => run(command)}
                        value={`${command.label} ${command.id}`}
                      >
                        <Icon aria-hidden="true" size={16} />
                        {command.label}
                        {command.keys.length ? (
                          <CommandShortcut>
                            <ShortcutKeys keys={command.keys} />
                          </CommandShortcut>
                        ) : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null
            )}
            <CommandGroup heading="Pages">
              {pages.map(({ href, Icon, label }) => (
                <CommandItem
                  key={href}
                  onSelect={() => navigate(href)}
                  value={`${label} ${href}`}
                >
                  <Icon aria-hidden="true" size={16} />
                  {label}
                  <CommandShortcut>
                    {pathname === href ? (
                      <span className="mr-2">Current</span>
                    ) : null}
                    <ShortcutKeys keys={keysByHref.get(href) ?? []} />
                  </CommandShortcut>
                </CommandItem>
              ))}
              {extraPages.map((command) => {
                const Icon = COMMAND_ICONS[command.id];
                const { href } = command;
                return href ? (
                  <CommandItem
                    key={command.id}
                    onSelect={() => navigate(href)}
                    value={`${command.label} ${href}`}
                  >
                    <Icon aria-hidden="true" size={16} />
                    {command.label.replace(GO_TO_PREFIX, "")}
                    <CommandShortcut>
                      {pathname === href ? (
                        <span className="mr-2">Current</span>
                      ) : null}
                      <ShortcutKeys keys={command.keys} />
                    </CommandShortcut>
                  </CommandItem>
                ) : null;
              })}
            </CommandGroup>
            {projects.length ? (
              <CommandGroup heading="Projects">
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => navigate(`/projects/${project.id}`)}
                    value={`${project.name} ${project.id}`}
                  >
                    <FolderOpen aria-hidden="true" size={16} />
                    {project.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {query.trim() ? (
              <CommandGroup heading="Search">
                <CommandItem
                  onSelect={() =>
                    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
                  }
                  value={`search ${query}`}
                >
                  <MagnifyingGlass aria-hidden="true" size={16} />
                  Search workspace for “{query.trim()}”
                  <CommandShortcut>Enter</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
          <div aria-hidden="true" className="pal-f">
            <span>
              <kbd className="kbd">↑</kbd>
              <kbd className="kbd">↓</kbd>
              Navigate
            </span>
            <span>
              <kbd className="kbd">↵</kbd>
              Open
            </span>
            <span>
              <kbd className="kbd">esc</kbd>
              Close
            </span>
          </div>
        </Command>
      </CommandDialog>
      <WorkspaceShortcutsHelp
        isMac={isMac}
        onOpenChange={setHelpOpen}
        open={helpOpen}
        viewer={viewer}
      />
      <QuickTaskForm
        onOpenChange={setTaskFormOpen}
        open={taskFormOpen}
        projects={projects}
        trigger={null}
      />
    </>
  );
};

export { WorkspaceSearchPalette };
