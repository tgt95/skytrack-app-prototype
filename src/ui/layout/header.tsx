import { memo } from "react";
import {
  DotsThreeIcon,
  FloppyDiskIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuTrigger,
} from "skytrack-ui/menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "skytrack-ui/breadcrumb";
import { TabsList, TabsTab } from "skytrack-ui/tabs";
import type { LibraryEntry } from "../../features/library/library";
import { SkyTooltip } from "../components/sky-tooltip";
import skytrackLogo from "../../assets/skytrack-logo.svg";

interface StudioTopbarProps {
  missionName: string;
  libraryEntry: LibraryEntry | null;
  dirty: boolean;
  reportSubpageOpen: boolean;
  onBackToLibrary: () => void;
  onOpenCrumbProject: () => void;
  onOpenCrumbMission: () => void;
  onOpenEdit: () => void;
  onSaveLocal: () => void;
}

function StudioTopbar({
  missionName,
  libraryEntry,
  dirty,
  reportSubpageOpen,
  onBackToLibrary,
  onOpenCrumbProject,
  onOpenCrumbMission,
  onOpenEdit,
  onSaveLocal,
}: StudioTopbarProps) {
  return (
    <header
      className=" [@media_(max-width:_61.25rem)]:flex-wrap flex items-center justify-between gap-3 min-h-12 py-[7.5px] px-3 border-b border-b-border bg-(--card) flex-[0_0_auto]"
      data-testid="ms-top"
    >
      <Breadcrumb
        className="flex min-w-0 flex-[1_1_auto] overflow-hidden text-[0.8125rem]"
        aria-label="Breadcrumb"
      >
        <BreadcrumbList className="m-0 min-w-0 list-none flex-nowrap gap-2 p-0 text-inherit">
          <BreadcrumbItem className="shrink-0">
            <SkyTooltip>
              <BreadcrumbLink
                render={
                  <button
                    type="button"
                    className="ms-crumb-btn bg-transparent [border:0] [font:inherit] text-inherit cursor-pointer rounded-(--radius) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1 ms-crumb-home inline-flex items-center"
                  />
                }
                data-testid="ms-crumb-home"
                onClick={onBackToLibrary}
                aria-label="Back to library home"
                title="Back to library home"
              >
                <img
                  src={skytrackLogo}
                  alt=""
                  aria-hidden="true"
                  className=" flex-[0_0_auto] block w-6 h-6"
                  data-testid="ms-crumb-logo"
                />
              </BreadcrumbLink>
            </SkyTooltip>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="ms-crumb-separator text-(--muted-foreground)" />
          {reportSubpageOpen ? (
            <>
              <BreadcrumbItem className="shrink-0">
                <Menu>
                  <MenuTrigger
                    aria-label="Show parent routes"
                    data-testid="ms-crumb-more"
                    render={
                      <button
                        type="button"
                        className="ms-crumb-btn inline-flex items-center justify-center bg-transparent [border:0] [font:inherit] text-inherit cursor-pointer rounded-(--radius) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1"
                      />
                    }
                  >
                    <DotsThreeIcon aria-hidden="true" />
                  </MenuTrigger>
                  <MenuPortal>
                    <MenuPositioner side="bottom" align="start" sideOffset={4}>
                      <MenuPopup aria-label="Parent routes">
                        <MenuItem onClick={onOpenCrumbProject}>
                          {libraryEntry?.project ?? "Project"}
                        </MenuItem>
                        <MenuItem onClick={onOpenCrumbMission}>
                          {libraryEntry?.mission ?? missionName}
                        </MenuItem>
                      </MenuPopup>
                    </MenuPositioner>
                  </MenuPortal>
                </Menu>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="ms-crumb-separator text-(--muted-foreground)" />
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <button
                      type="button"
                      className="ms-crumb-btn bg-transparent [border:0] [font:inherit] cursor-pointer rounded-(--radius) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1 ms-crumb-dim text-(--muted-foreground)"
                    />
                  }
                  data-testid="ms-crumb-reports"
                  onClick={() =>
                    window.dispatchEvent(
                      new Event("ms:back-to-mission-reports"),
                    )
                  }
                >
                  Mission Reports
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="ms-crumb-separator text-(--muted-foreground)" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="ms-crumb-name font-semibold overflow-hidden text-ellipsis whitespace-nowrap max-w-80 [@media_(max-width:_73.75rem)]:max-w-45">
                  Mission Insights
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : libraryEntry ? (
            <>
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbLink
                  render={
                    <button
                      type="button"
                      className="ms-crumb-btn bg-transparent [border:0] [font:inherit] cursor-pointer rounded-(--radius) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1 ms-crumb-dim text-(--muted-foreground)"
                    />
                  }
                  data-testid="ms-crumb-project"
                  onClick={onOpenCrumbProject}
                  aria-label={`Open project ${libraryEntry.project} with its missions`}
                  title={`Open project ${libraryEntry.project} with its missions`}
                >
                  {libraryEntry.project}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="ms-crumb-separator text-(--muted-foreground)" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="ms-crumb-name font-semibold overflow-hidden text-ellipsis whitespace-nowrap max-w-80 [@media_(max-width:_73.75rem)]:max-w-45">
                  {libraryEntry.mission}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <>
              <BreadcrumbItem>
                <span className="ms-crumb-dim text-(--muted-foreground)">
                  Missions
                </span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="ms-crumb-separator text-(--muted-foreground)" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="ms-crumb-name font-semibold overflow-hidden text-ellipsis whitespace-nowrap max-w-80 [@media_(max-width:_73.75rem)]:max-w-45">
                  {missionName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      {reportSubpageOpen ? (
        <TabsList
          aria-label="Mission report views"
          data-testid="ms-report-view-nav"
          variant="filled"
          size="sm"
          showIndicator={false}
          className="shrink-0"
        >
          <TabsTab value="insights" data-testid="ms-report-view-insights">
            Insights
          </TabsTab>
          <TabsTab
            value="post-flight"
            disabled
            aria-describedby="ms-pfa-unavailable"
            title="Post Flight is not available in this Mission Studio preview."
            data-testid="ms-report-view-post-flight"
          >
            Post Flight
          </TabsTab>
        </TabsList>
      ) : null}
      {!reportSubpageOpen ? (
        <div
          className=" flex items-center gap-1.5 flex-[0_0_auto]"
          data-testid="ms-top-actions"
        >
          <Button size="sm" variant="outline" onClick={onOpenEdit}>
            <PencilSimpleIcon aria-hidden="true" /> Edit Mission
          </Button>
          <Button
            size="sm"
            onClick={onSaveLocal}
            disabled={!dirty}
            aria-label="Save local state (Ctrl+S)"
          >
            <FloppyDiskIcon aria-hidden="true" /> Save
          </Button>
        </div>
      ) : null}
    </header>
  );
}

export default memo(StudioTopbar);
