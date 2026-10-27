import { CaretDownIcon, CheckIcon, GearIcon } from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  Menu,
  MenuPortal,
  MenuPopup,
  MenuPositioner,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuTrigger,
} from "skytrack-ui/menu";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import { WORKSPACES } from "./workspace-data.ts";
import type { WorkspaceDefinition } from "./workspace-data.ts";

export function LibraryWorkspaceSwitcher({
  activeWorkspace,
  onSwitchWorkspace,
  onAnnounce,
}: {
  activeWorkspace: WorkspaceDefinition;
  onSwitchWorkspace: (id: string) => void;
  onAnnounce: (message: string) => void;
}) {
  return (
    <div
      className=" flex items-start gap-1.5 min-w-0 pt-0 px-0.5 pb-0.5 [@media_(max-width:_61.25rem)]:justify-center [@media_(max-width:_61.25rem)]:p-0"
      data-testid="ms-lib-workspace-head"
    >
      <div className="ms-lib-workspace-switcher flex-[1_1_auto] min-w-0">
        <Menu>
          <MenuTrigger
            aria-label={`Switch workspace, currently ${activeWorkspace.name}`}
            data-testid="ms-lib-workspace-switcher"
            render={
              <button
                type="button"
                className=" flex items-center justify-between gap-2 w-full min-w-0 min-h-8 py-1 px-1.5 [border:0] rounded-(--radius) bg-transparent text-(--sidebar-foreground) text-left cursor-pointer [transition:background-color_150ms_ease,color_150ms_ease] [&:hover]:bg-(--sidebar-accent) [&:hover]:text-(--sidebar-accent-foreground) data-popup-open:bg-(--sidebar-accent) data-popup-open:text-(--sidebar-accent-foreground) focus-visible:outline-2 focus-visible:outline-(--ring) focus-visible:outline-offset-2 [@media_(max-width:_61.25rem)]:justify-center [@media_(max-width:_61.25rem)]:p-0"
                data-testid="ms-lib-workspace-select"
              />
            }
          >
            <span
              className=" hidden items-center justify-center w-8.5 h-8.5 rounded-(--radius) bg-(--sidebar-accent) text-(--sidebar-accent-foreground) text-sm font-bold [@media_(max-width:_61.25rem)]:inline-flex"
              aria-hidden="true"
              data-testid="ms-lib-workspace-avatar"
            >
              {activeWorkspace.name.slice(0, 1)}
            </span>
            <span
              className=" min-w-0 overflow-hidden text-sm font-semibold leading-6 text-ellipsis whitespace-nowrap [@media_(max-width:_61.25rem)]:hidden"
              data-testid="ms-lib-workspace-name"
            >
              {activeWorkspace.name}
            </span>
            <span
              data-testid="ms-lib-workspace-caret"
              className="inline-flex items-center justify-center w-6 h-6 grow-0 shrink-0 basis-6 [@media_(max-width:_61.25rem)]:hidden"
              aria-hidden="true"
            >
              <CaretDownIcon className="w-4 h-4 flex-[0_0_auto]" />
            </span>
          </MenuTrigger>
          <MenuPortal>
            <MenuPositioner side="bottom" align="start" sideOffset={4}>
              <MenuPopup aria-label="Workspaces" className="w-72">
                <MenuRadioGroup
                  value={activeWorkspace.id}
                  onValueChange={(value: string | null) => {
                    if (value) onSwitchWorkspace(value);
                  }}
                >
                  {WORKSPACES.map((workspace) => (
                    <MenuRadioItem
                      key={workspace.id}
                      value={workspace.id}
                      inset
                      className="!pl-8"
                    >
                      <MenuRadioItemIndicator>
                        <CheckIcon
                          aria-hidden="true"
                          weight="bold"
                          className="size-3.5"
                        />
                      </MenuRadioItemIndicator>
                      <span>{workspace.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {workspace.role}
                      </span>
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              </MenuPopup>
            </MenuPositioner>
          </MenuPortal>
        </Menu>
        <div
          className=" mt-0.5 mr-0 mb-0 ml-1.5 [@media_(max-width:_61.25rem)]:hidden"
          data-testid="ms-lib-workspace-role"
        >
          <Badge count={activeWorkspace.role} status="default" />
        </div>
      </div>
      <SkyTooltip>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className=" mt-1 text-(--sidebar-foreground) [&:hover]:bg-(--sidebar-accent) [&:hover]:text-(--sidebar-accent-foreground) [@media_(max-width:_61.25rem)]:hidden"
          aria-label="Workspace settings"
          title="Workspace settings"
          onClick={() => onAnnounce(`${activeWorkspace.name} settings`)}
        >
          <GearIcon aria-hidden="true" />
        </Button>
      </SkyTooltip>
    </div>
  );
}
