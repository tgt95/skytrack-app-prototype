import { FileImageIcon, FileVideoIcon, LaptopIcon, WarningCircleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import { Search } from "skytrack-ui/search";
import type { InsightMedia } from "./mission-insights-report-data";

export type MediaFilter = "all" | "images" | "videos" | "detections" | "remote";
export type MediaBrowserSelection = MediaFilter | "other-files";

export function matchesMediaFilter(item: InsightMedia, filter: MediaFilter) {
  if (filter === "images") return item.kind === "image";
  if (filter === "videos") return item.kind === "video";
  if (filter === "detections") return item.detectionCount > 0;
  if (filter === "remote") return item.availability !== "local";
  return true;
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
    items: ReadonlyArray<{ value: MediaBrowserSelection; label: string }>;
  }>;
}) {
  return (
    <nav className="flex min-w-0 flex-col gap-4 p-4" aria-label="Media filters">
      <h3 className="m-0 mb-2 text-sm font-semibold text-foreground">Browse</h3>
      {groups.map((group) => (
        <section key={group.label} className="flex min-w-0 flex-col gap-1" aria-label={group.label}>
          <h4 className="m-0 mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h4>
          {group.items.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={selection === item.value ? "secondary" : "ghost"}
              aria-pressed={selection === item.value}
              className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left"
              onClick={() => onChange(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </section>
      ))}
    </nav>
  );
}

export function MediaFileSearchBar({
  query,
  onQueryChange,
  trailingFilter,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  trailingFilter: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <Search
        value={query}
        onValueChange={onQueryChange}
        placeholder="Search file name"
        aria-label="Search file name"
        className="min-w-0 flex-1"
      />
      {trailingFilter}
    </div>
  );
}

export function MediaBrowserFileList({
  media,
  syntheticGallery,
  selectedId,
  onSelect,
  searchBar,
}: {
  media: InsightMedia[];
  syntheticGallery: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  searchBar: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 p-4" aria-label="Media records">
      <header className="flex items-center justify-between gap-3">
        <h3 className="m-0 text-sm font-semibold text-foreground">{syntheticGallery ? "Survey images" : "Captured media"}</h3>
        <Badge className="rounded-(--radius)" count={media.length} status="secondary" />
      </header>
      {searchBar}
      <p className="m-0 text-xs text-muted-foreground">Showing {media.length} records</p>
      {media.length ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Media files">
          {media.map((item) => {
            const selected = item.id === selectedId;
            const Icon = item.kind === "video" ? FileVideoIcon : FileImageIcon;
            const availability = item.syntheticPreview
              ? "Preview"
              : item.availability === "local"
                ? "On this computer"
                : item.availability === "remote_only"
                  ? "Mission Computer"
                  : item.availability === "missing"
                    ? "Missing"
                    : "Unavailable";
            return (
              <li key={item.id}>
                <Button
                  type="button"
                  size="sm"
                  variant={selected ? "secondary" : "ghost"}
                  aria-pressed={selected}
                  className="h-auto w-full justify-start gap-3 whitespace-normal px-3 py-3 text-left"
                  onClick={() => onSelect(item.id)}
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.actionName} · {availability}
                    </span>
                  </span>
                  {item.detectionCount > 0 ? (
                    <Badge className="rounded-(--radius)" count={item.detectionCount} status="secondary" />
                  ) : item.availability === "remote_only" ? (
                    <LaptopIcon className="size-4 shrink-0" aria-hidden="true" />
                  ) : item.availability === "missing" ? (
                    <WarningCircleIcon className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                  ) : null}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 py-6 text-sm text-muted-foreground">No media records match this search or filter.</p>
      )}
    </section>
  );
}
