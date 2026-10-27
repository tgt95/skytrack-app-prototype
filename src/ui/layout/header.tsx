import { memo } from "react";
import { FloppyDiskIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "skytrack-ui/breadcrumb";
import type { LibraryEntry } from "../../features/library/library";
import { SkyTooltip } from "../components/sky-tooltip";
import skytrackLogo from "../../assets/skytrack-logo.svg";

interface StudioTopbarProps {
  missionName: string;
  libraryEntry: LibraryEntry | null;
  dirty: boolean;
  onBackToLibrary: () => void;
  onOpenCrumbProject: () => void;
  onOpenEdit: () => void;
  onSaveLocal: () => void;
}

function StudioTopbar({
  missionName,
  libraryEntry,
  dirty,
  onBackToLibrary,
  onOpenCrumbProject,
  onOpenEdit,
  onSaveLocal,
}: StudioTopbarProps) {
  return (
    <header
      className=" [@media_(max-width:_61.25rem)]:flex-wrap flex items-center justify-between gap-3 py-2 px-3 border-b border-b-border bg-(--card) flex-[0_0_auto]"
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
                    className="ms-crumb-btn ms-crumb-home inline-flex items-center"
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
          <BreadcrumbSeparator className="ms-crumb-separator" />
          {libraryEntry ? (
            <>
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbLink
                  render={
                    <button
                      type="button"
                      className="ms-crumb-btn ms-crumb-dim"
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
              <BreadcrumbSeparator className="ms-crumb-separator" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="ms-crumb-name">
                  {libraryEntry.mission}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <>
              <BreadcrumbItem>
                <span className="ms-crumb-dim">Missions</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="ms-crumb-separator" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="ms-crumb-name">
                  {missionName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
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
    </header>
  );
}

export default memo(StudioTopbar);
