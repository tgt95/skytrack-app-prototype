import {
  FileImageIcon,
  FileVideoIcon,
  ListBulletsIcon,
  PlayIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Search } from "skytrack-ui/search";
import { Tabs, TabsList, TabsTab } from "skytrack-ui/tabs";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "skytrack-ui/sidebar";
import type { InsightMedia } from "./mission-insights-report-data";

export type MediaFilter = "all" | "images" | "videos" | "detections";
export type MediaBrowserSelection =
  "images" | "videos" | "detections" | "other-files";
export type MediaViewMode = "grid" | "list";

export function matchesMediaFilter(item: InsightMedia, filter: MediaFilter) {
  if (filter === "images") return item.kind === "image";
  if (filter === "videos") return item.kind === "video";
  if (filter === "detections")
    return item.detectionCount > 0 || item.detectionEventsDuringRecording > 0;
  return true;
}

function mediaSourceLabel(item: InsightMedia) {
  if (item.availability === "local") return "Local";
  if (item.availability === "remote_only") return "Mission Computer";
  return "Unknown source";
}

function mediaStatusLabel(item: InsightMedia) {
  if (item.availability === "missing") return "Missing";
  if (item.processingError) return "Error";
  return null;
}

export function MediaBrowserFilters({
  selection,
  onChange,
  groups,
}: {
  selection: MediaBrowserSelection;
  onChange: (selection: MediaBrowserSelection) => void;
  groups: ReadonlyArray<{
    label: string;
    items: ReadonlyArray<{
      value: MediaBrowserSelection;
      label: string;
      count: number;
      Icon: PhosphorIcon;
    }>;
  }>;
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar
      collapsible="none"
      aria-label="Media filters"
      className="h-full min-h-0 border-sidebar-border bg-card text-sidebar-foreground [&_.sidebar-content]:flex-col [&_.sidebar-content]:gap-0 [&_.sidebar-group]:border-b [&_.sidebar-group]:border-sidebar-border [&_.sidebar-group]:last:border-b-0 [&_.sidebar-group-label]:px-4 [&_.sidebar-group-label]:py-3 [&_.sidebar-group-label]:text-xs [&_.sidebar-group-label]:font-medium [&_.sidebar-group-label]:text-sidebar-foreground/70 [&_.sidebar-menu-button]:px-4 [&_.sidebar-menu-button]:py-3 [&_.sidebar-menu-button]:text-sm"
    >
      {/* <SidebarHeader className="px-4 py-3">
        <span className="text-xs sub-heading text-sidebar-foreground/70">
          Browse
        </span>
      </SidebarHeader> */}
      <SidebarContent className="gap-0">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={selection === item.value}
                      onClick={() => {
                        onChange(item.value);
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <item.Icon
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {item.count}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

export function MediaFileSearchBar({
  query,
  onQueryChange,
  trailingFilter,
  viewMode,
  onViewModeChange,
  showViewMode = true,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  trailingFilter: ReactNode;
  viewMode: MediaViewMode;
  onViewModeChange: (value: MediaViewMode) => void;
  showViewMode?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="md:hidden" aria-label="Open media filters" />
        <Search
          value={query}
          onValueChange={onQueryChange}
          placeholder="Search file name"
          aria-label="Search file name"
          className="min-w-0 flex-1"
          size="sm"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        {showViewMode ? (
          <Tabs
            value={viewMode}
            onValueChange={(value) => onViewModeChange(value as MediaViewMode)}
            className="w-fit"
          >
            <TabsList
              variant="filled"
              size="sm"
              showIndicator={false}
              aria-label="Media view mode"
            >
              <TabsTab value="grid" aria-label="Grid view" title="Grid view">
                <SquaresFourIcon aria-hidden="true" />
              </TabsTab>
              <TabsTab value="list" aria-label="List view" title="List view">
                <ListBulletsIcon aria-hidden="true" />
              </TabsTab>
            </TabsList>
          </Tabs>
        ) : null}
        {trailingFilter}
      </div>
    </div>
  );
}

export function MediaBrowserFileList({
  media,
  selectedId,
  onSelect,
  searchBar,
  viewMode,
  emptyMessage,
}: {
  media: InsightMedia[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchBar: ReactNode;
  viewMode: MediaViewMode;
  emptyMessage: string;
}) {
  const recordCount = media.length;
  return (
    <section
      className="flex min-h-0 min-w-0 flex-col gap-4 p-6 xl:h-full"
      aria-label="Media records"
    >
      {searchBar}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <p className="m-0 text-xs sub-heading">{recordCount} records</p>
        {recordCount ? (
          <ul
            className={`m-0 grid min-h-0 flex-1 list-none gap-3 overflow-y-auto p-0 ${
              viewMode === "grid"
                ? "grid-cols-2 sm:grid-cols-3 content-start"
                : "grid-cols-1 content-start"
            }`}
            aria-label="Files"
          >
            {media.map((item) => {
              const selected = item.id === selectedId;
              const Icon =
                item.kind === "video" ? FileVideoIcon : FileImageIcon;
              const status = mediaStatusLabel(item);
              return (
                <li key={item.id} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    className={`flex h-full min-h-16 w-full cursor-pointer appearance-none items-center gap-3 rounded-(--radius) border px-3 py-3 text-left [font:inherit] transition-colors focus-visible:outline-2 focus-visible:outline-(--ring) focus-visible:outline-offset-2 ${
                      viewMode === "grid"
                        ? "flex-col items-start justify-start gap-2"
                        : "justify-start gap-3"
                    } ${
                      selected
                        ? "border-primary bg-secondary text-secondary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted/60"
                    }`}
                    onClick={() => onSelect(item.id)}
                  >
                    <span
                      className={`relative flex items-center justify-center overflow-hidden rounded-(--radius) border border-border bg-(--muted) ${
                        viewMode === "grid"
                          ? "aspect-video w-full"
                          : "aspect-video w-24 shrink-0"
                      }`}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          aria-hidden="true"
                          className="size-full object-cover"
                        />
                      ) : (
                        <Icon
                          className={
                            viewMode === "grid"
                              ? "size-8 text-muted-foreground"
                              : "size-5 text-muted-foreground"
                          }
                          aria-hidden="true"
                        />
                      )}
                      {item.kind === "video" && item.imageUrl ? (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
                          <span className="flex items-center justify-center size-7 rounded-full bg-background/90 text-foreground">
                            <PlayIcon
                              className="size-4"
                              aria-hidden="true"
                              weight="fill"
                            />
                          </span>
                        </div>
                      ) : null}
                      {viewMode === "grid" && status ? (
                        <span className="absolute right-1 top-1 flex">
                          <Badge
                            className="rounded-(--radius)"
                            count={status}
                            size="sm"
                            status={status === "Error" ? "error" : "warning"}
                          />
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`flex min-w-0 flex-1 flex-col justify-center gap-1 ${
                        viewMode === "grid" ? "w-full" : ""
                      }`}
                    >
                      <span className="flex w-full min-w-0 items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {item.name}
                        </span>
                        {viewMode === "list" && status ? (
                          <Badge
                            className="shrink-0 rounded-(--radius)"
                            count={status}
                            size="sm"
                            status={status === "Error" ? "error" : "warning"}
                          />
                        ) : null}
                      </span>
                      <span
                        className={`flex w-full min-w-0 items-center gap-1.5 text-sm text-muted-foreground ${
                          viewMode === "grid"
                            ? "flex-wrap gap-y-1"
                            : "overflow-hidden"
                        }`}
                      >
                        <span className="shrink-0">
                          {item.kind === "video" &&
                          item.detectionEventsDuringRecording > 0
                            ? `${item.detectionEventsDuringRecording} detections`
                            : `${item.detectionCount} detections`}
                        </span>
                        {viewMode === "list" ? (
                          <span aria-hidden="true">·</span>
                        ) : null}
                        <span
                          className={
                            viewMode === "list"
                              ? "truncate"
                              : "basis-full break-words"
                          }
                        >
                          {mediaSourceLabel(item)}
                        </span>
                        {viewMode === "list" && item.captureTime !== null ? (
                          <span className="shrink-0 ml-auto">
                            +{item.captureTime.toFixed(1)} s
                          </span>
                        ) : null}
                      </span>
                      {viewMode === "grid" && item.captureTime !== null ? (
                        <span className="text-xs text-muted-foreground mt-1">
                          +{item.captureTime.toFixed(1)} s
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="m-0 py-6 text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </div>
    </section>
  );
}
