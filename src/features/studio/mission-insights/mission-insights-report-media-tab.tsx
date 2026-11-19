import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  FileImageIcon,
  FileVideoIcon,
  FilesIcon,
  FunnelSimpleIcon,
} from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import type { MissionInsightsReportTab } from "@/features/studio/mission-report-url";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "skytrack-ui/empty";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuPortal,
  MenuPopup,
  MenuPositioner,
  MenuSeparator,
  MenuTrigger,
} from "skytrack-ui/menu";
import { RadioGroup, RadioRoot } from "skytrack-ui/radio";
import { Separator } from "skytrack-ui/separator";
import { SidebarProvider } from "skytrack-ui/sidebar";
import { CheckboxIndicator, CheckboxRoot } from "skytrack-ui/checkbox";
import {
  asRecord,
  asRecords,
  reportArtifacts,
  reportForSample,
  sampleGalleryMedia,
  missionLogicSource,
  textValue,
  type JsonRecord,
  type InsightMedia,
} from "./mission-insights-report-data";
import { statusLabel } from "./mission-insights-report-shared";
import type { MissionInsightSample } from "./mission-insights-data";
import {
  MediaBrowserFileList,
  MediaBrowserFilters,
  MediaFileSearchBar,
  matchesMediaFilter,
  type MediaBrowserSelection,
  type MediaViewMode,
} from "./mission-insights-report-media-gallery";
import {
  MediaFilesSection,
  FileDetailsPanel,
} from "./mission-insights-report-media-files";
import { sanitizedReportPath } from "./mission-insights-report-media-path";
import { MediaMetadataPanel } from "./mission-insights-report-media-metadata";
import {
  MediaPreview,
  MediaPreviewHeader,
} from "./mission-insights-report-media-preview";

type MediaSourceFilter = "local" | "remote_only";
type MediaStatusFilter = "available" | "missing" | "error";

function reportArtifactName(artifact: JsonRecord) {
  const metadata = asRecord(artifact.metadata);
  const file = asRecord(metadata.file);
  return textValue(
    file.name,
    sanitizedReportPath(artifact).split("/").at(-1) ?? "",
  );
}

function toggleFilterValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

function initialMediaId(media: InsightMedia[], sample: MissionInsightSample) {
  const preferred =
    media.find((item) => item.kind === "image" && item.detectionCount > 0) ??
    media.find((item) => item.syntheticPreview) ??
    (sample.key === "simulation-succeeded"
      ? media.find((item) => item.name === "000005.jpg")
      : media.find((item) => item.kind === "image" && item.imageUrl));
  return preferred?.id ?? media[0]?.id ?? "";
}

export function MediaFilesTab({
  sample,
  selectedMediaId,
  active,
  onNavigate,
}: {
  sample: MissionInsightSample;
  selectedMediaId: string | null;
  active: boolean;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  const report = reportForSample(sample);
  const [browserSelection, setBrowserSelection] =
    useState<MediaBrowserSelection>("images");
  const [selectionBeforeDetections, setSelectionBeforeDetections] = useState<
    "images" | "videos"
  >("images");
  const [selectedSources, setSelectedSources] = useState<MediaSourceFilter[]>(
    [],
  );
  const [selectedStatuses, setSelectedStatuses] = useState<MediaStatusFilter[]>(
    [],
  );
  const [selectedKind, setSelectedKind] = useState("all");
  const [viewMode, setViewMode] = useState<MediaViewMode>("list");
  const [query, setQuery] = useState("");
  const mediaPanelRef = useRef<HTMLElement>(null);
  const [mediaPanelTop, setMediaPanelTop] = useState(0);
  const media = useMemo(() => sampleGalleryMedia(sample), [sample]);
  const [selectedId, setSelectedId] = useState(() =>
    initialMediaId(media, sample),
  );
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState("");

  useLayoutEffect(() => {
    if (!active) return;
    const panel = mediaPanelRef.current;
    if (!panel?.isConnected) return;
    const page = panel.closest('[data-testid="ms-mission-insights"]');
    const pageHeader = page?.querySelector('[data-slot="page-header"]');
    const updateTop = () => {
      if (!panel.isConnected || panel.getClientRects().length === 0) return;
      const headerBottom = pageHeader?.getBoundingClientRect().bottom;
      // Inactive report tabs can remain in layout while their transition ends,
      // temporarily pushing the media panel far below the viewport. The sticky
      // page header is the stable boundary the panel should fill from.
      const panelTop = Math.ceil(
        headerBottom && headerBottom > 0 ? headerBottom : panel.offsetTop,
      );
      setMediaPanelTop((current) =>
        current === panelTop ? current : panelTop,
      );
    };
    const observer = new ResizeObserver(updateTop);
    observer.observe(pageHeader ?? panel);
    window.addEventListener("resize", updateTop);
    updateTop();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateTop);
    };
  }, [active]);

  useEffect(() => {
    setSelectedId(
      selectedMediaId && media.some((item) => item.id === selectedMediaId)
        ? selectedMediaId
        : initialMediaId(media, sample),
    );
    setSelectedFileId("");
    setBrowserSelection("images");
    setSelectedSources([]);
    setSelectedStatuses([]);
    setSelectedKind("all");
    setQuery("");
  }, [media, sample, selectedMediaId]);

  const visibleMedia = useMemo(
    () =>
      media
        .filter((item) => {
          if (browserSelection === "other-files") return false;
          return matchesMediaFilter(item, browserSelection);
        })
        .filter(
          (item) =>
            selectedSources.length === 0 ||
            selectedSources.includes(item.availability as MediaSourceFilter),
        )
        .filter((item) => {
          if (selectedStatuses.length === 0) return true;
          return selectedStatuses.some((status) => {
            if (status === "error") return Boolean(item.processingError);
            if (status === "missing") return item.availability === "missing";
            return ["local", "remote_only"].includes(item.availability);
          });
        })
        .filter((item) =>
          item.name.toLowerCase().includes(query.trim().toLowerCase()),
        ),
    [browserSelection, media, query, selectedSources, selectedStatuses],
  );
  const selected = visibleMedia.find((item) => item.id === selectedId) ?? null;
  useEffect(() => {
    if (browserSelection === "other-files" || selectedFileId) {
      setSelectedId("");
      return;
    }
    setSelectedId((current) =>
      visibleMedia.some((item) => item.id === current)
        ? current
        : (visibleMedia[0]?.id ?? ""),
    );
  }, [browserSelection, selectedFileId, visibleMedia]);
  const selectedDetection = selected?.detection
    ? asRecord(selected.detection.metadata)
    : {};
  const detectionObjects = asRecords(selectedDetection.objects);
  const files = useMemo(
    () =>
      reportArtifacts(report).filter(
        (artifact) => artifact.type !== "image" && artifact.type !== "video",
      ),
    [report],
  );
  const visibleFiles = useMemo(
    () =>
      files
        .filter(
          (artifact) =>
            selectedKind === "all" || textValue(artifact.type) === selectedKind,
        )
        .filter((artifact) => {
          if (selectedSources.length === 0) return true;
          const source = textValue(asRecord(artifact.availability).state);
          return selectedSources.includes(source as MediaSourceFilter);
        })
        .filter((artifact) => {
          if (selectedStatuses.length === 0) return true;
          const source = textValue(asRecord(artifact.availability).state);
          return selectedStatuses.some((status) => {
            if (status === "error") return source === "error";
            if (status === "missing") return source === "missing";
            return ["local", "remote_only"].includes(source);
          });
        }),
    [files, selectedKind, selectedSources, selectedStatuses],
  );
  const searchedFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return visibleFiles;
    return visibleFiles.filter((artifact) => {
      return reportArtifactName(artifact)
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, visibleFiles]);
  const selectedFile =
    searchedFiles.find((artifact) => artifact.artifact_id === selectedFileId) ??
    null;
  useEffect(() => {
    if (
      selectedFileId &&
      !searchedFiles.some(
        (artifact) => textValue(artifact.artifact_id) === selectedFileId,
      )
    ) {
      setSelectedFileId("");
    }
  }, [searchedFiles, selectedFileId]);
  const selectedFileMetadata = asRecord(selectedFile?.metadata);
  const selectedFileDetails = asRecord(selectedFileMetadata.file);
  const selectedFileName = selectedFile ? reportArtifactName(selectedFile) : "";
  const selectedFileContent =
    textValue(
      selectedFileDetails.content,
      textValue(
        selectedFileMetadata.content,
        textValue(selectedFile?.content, ""),
      ),
    ) ||
    (textValue(selectedFile?.type) === "mission_source"
      ? missionLogicSource(sample)
      : "");
  const fileEmptyMessage =
    files.length === 0
      ? "This report has no other files."
      : searchedFiles.length === 0
        ? "No other files match the current search or filters."
        : "Select a file to view its preview and details.";
  const mediaEmptyMessage =
    media.length === 0
      ? "This report has no media items."
      : "No media matches the current search or filters.";
  const kindOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of files) {
      const kind = textValue(file.type);
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    return [
      { value: "all", label: "All kinds", count: files.length },
      ...[...counts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([kind, count]) => ({
          value: kind,
          label: statusLabel(kind),
          count,
        })),
    ];
  }, [files]);
  const failedInvocation = selected
    ? asRecords(report.invocations).some(
        (invocation) =>
          invocation.input_artifact_id === selected.id &&
          invocation.result === "failed",
      )
    : false;
  const browseGroups: ReadonlyArray<{
    label: string;
    items: ReadonlyArray<{
      value: MediaBrowserSelection;
      label: string;
      count: number;
      Icon: typeof FilesIcon;
    }>;
  }> = [
    {
      label: "Files",
      items: [
        {
          value: "images",
          label: "Images",
          count: media.filter((item) => item.kind === "image").length,
          Icon: FileImageIcon,
        },
        {
          value: "videos",
          label: "Videos",
          count: media.filter((item) => item.kind === "video").length,
          Icon: FileVideoIcon,
        },
        {
          value: "other-files",
          label: "Other files",
          count: files.length,
          Icon: FilesIcon,
        },
      ],
    },
  ];

  function changeBrowserSelection(nextSelection: MediaBrowserSelection) {
    setBrowserSelection(nextSelection);
    setSelectedFileId("");
    if (nextSelection === "other-files") {
      setSelectedId("");
      if (browserSelection !== "other-files") setSelectedKind("all");
      return;
    }
    setSelectedKind("all");
    const nextVisible = media.filter((item) =>
      matchesMediaFilter(item, nextSelection),
    );
    setSelectedId((current) =>
      nextVisible.some((item) => item.id === current)
        ? current
        : (nextVisible[0]?.id ?? ""),
    );
  }

  function setDetectionFilterEnabled(enabled: boolean) {
    if (enabled) {
      setSelectionBeforeDetections(
        browserSelection === "videos" ? "videos" : "images",
      );
      setBrowserSelection("detections");
      return;
    }
    if (browserSelection === "detections") {
      setBrowserSelection(selectionBeforeDetections);
    }
  }

  function checkboxFilterRow({
    checked,
    label,
    onChange,
  }: {
    checked: boolean;
    label: string;
    onChange: (checked: boolean) => void;
  }) {
    return (
      <label className="flex cursor-pointer items-center gap-3 rounded-(--radius) px-2 py-2 text-sm">
        <CheckboxRoot
          checked={checked}
          onCheckedChange={(value) => onChange(value === true)}
        >
          <CheckboxIndicator aria-hidden="true">✓</CheckboxIndicator>
        </CheckboxRoot>
        <span>{label}</span>
      </label>
    );
  }

  const hasActiveFilters =
    browserSelection === "detections" ||
    selectedKind !== "all" ||
    selectedSources.length > 0 ||
    selectedStatuses.length > 0;
  const filterButton = (
    <Menu>
      <MenuTrigger
        aria-label={`Filter${hasActiveFilters ? ", filters active" : ""}`}
        render={
          <Button
            type="button"
            variant={hasActiveFilters ? "secondary" : "outline"}
            size="icon-sm"
          />
        }
      >
        <Badge dot={hasActiveFilters} status="processing">
          <FunnelSimpleIcon aria-hidden="true" />
        </Badge>
      </MenuTrigger>
      <MenuPortal>
        <MenuPositioner side="bottom" align="end" sideOffset={4}>
          <MenuPopup
            aria-label="Media and file filters"
            className="max-h-[min(60vh,32rem)] min-w-56 overflow-y-auto"
          >
            {browserSelection === "other-files" ? (
              <MenuGroup className="w-full">
                <MenuGroupLabel>File type</MenuGroupLabel>
                <RadioGroup
                  value={selectedKind}
                  onValueChange={(value) => {
                    if (typeof value === "string" && value) {
                      setSelectedKind(value);
                      setSelectedFileId("");
                    }
                  }}
                  aria-label="File type"
                  className="w-full gap-0.5"
                >
                  {kindOptions.map((item) => (
                    <div
                      key={item.value}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-(--radius) px-2 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        setSelectedKind(item.value);
                        setSelectedFileId("");
                      }}
                    >
                      <RadioRoot value={item.value} aria-label={item.label} />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </RadioGroup>
              </MenuGroup>
            ) : (
              <MenuGroup>
                <MenuGroupLabel>Media</MenuGroupLabel>
                {checkboxFilterRow({
                  checked: browserSelection === "detections",
                  label: "Filter by detection",
                  onChange: setDetectionFilterEnabled,
                })}
              </MenuGroup>
            )}
            <MenuSeparator />
            <MenuGroup>
              <MenuGroupLabel>Source</MenuGroupLabel>
              {checkboxFilterRow({
                checked: selectedSources.includes("local"),
                label: "Local",
                onChange: () =>
                  setSelectedSources((current) =>
                    toggleFilterValue(current, "local"),
                  ),
              })}
              {checkboxFilterRow({
                checked: selectedSources.includes("remote_only"),
                label: "Mission Computer",
                onChange: () =>
                  setSelectedSources((current) =>
                    toggleFilterValue(current, "remote_only"),
                  ),
              })}
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              <MenuGroupLabel>Status</MenuGroupLabel>
              {checkboxFilterRow({
                checked: selectedStatuses.includes("available"),
                label: "Available",
                onChange: () =>
                  setSelectedStatuses((current) =>
                    toggleFilterValue(current, "available"),
                  ),
              })}
              {checkboxFilterRow({
                checked: selectedStatuses.includes("missing"),
                label: "Missing",
                onChange: () =>
                  setSelectedStatuses((current) =>
                    toggleFilterValue(current, "missing"),
                  ),
              })}
              {checkboxFilterRow({
                checked: selectedStatuses.includes("error"),
                label: "Error",
                onChange: () =>
                  setSelectedStatuses((current) =>
                    toggleFilterValue(current, "error"),
                  ),
              })}
            </MenuGroup>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </Menu>
  );
  const showMediaViewMode = ["images", "videos", "detections"].includes(
    browserSelection,
  );
  const searchBar = (
    <MediaFileSearchBar
      query={query}
      onQueryChange={setQuery}
      trailingFilter={filterButton}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showViewMode={showMediaViewMode}
    />
  );

  return (
    <section
      ref={mediaPanelRef}
      className="flex min-w-0 flex-col xl:h-[var(--media-panel-height)] xl:min-h-0"
      style={
        {
          "--media-panel-height": `calc(100dvh - ${mediaPanelTop}px)`,
        } as CSSProperties
      }
      aria-label="Media & Files"
    >
      <SidebarProvider
        className="min-h-0 w-full flex-1 xl:h-full"
        style={{ "--sidebar-width": "15rem" } as CSSProperties}
      >
        <MediaBrowserFilters
          selection={
            browserSelection === "detections"
              ? selectionBeforeDetections
              : browserSelection
          }
          onChange={changeBrowserSelection}
          groups={browseGroups}
        />
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 divide-y divide-border xl:h-full xl:grid-cols-[minmax(20rem,1fr)_minmax(0,1.5fr)] xl:divide-x xl:divide-y-0">
          <div className="min-h-0 min-w-0 xl:h-full">
            {browserSelection === "other-files" ? (
              <div className="min-h-0 min-w-0 p-6 xl:h-full">
                <MediaFilesSection
                  files={visibleFiles}
                  selectedFileId={selectedFileId}
                  onInspect={setSelectedFileId}
                  query={query}
                  searchBar={searchBar}
                />
              </div>
            ) : (
              <MediaBrowserFileList
                media={visibleMedia}
                selectedId={selectedId}
                searchBar={searchBar}
                viewMode={showMediaViewMode ? viewMode : "list"}
                emptyMessage={mediaEmptyMessage}
                onSelect={(id) => {
                  setSelectedId(id);
                  setOverlayVisible(true);
                }}
              />
            )}
          </div>
          <section
            className="flex min-h-0 min-w-0 flex-col xl:h-full"
            aria-label={
              browserSelection === "other-files"
                ? "Selected file details"
                : "Selected media preview and details"
            }
          >
            {browserSelection === "other-files" ? (
              <FileDetailsPanel
                file={selectedFile}
                fileName={selectedFileName}
                source={selectedFileContent}
                emptyMessage={fileEmptyMessage}
              />
            ) : selected ? (
              <>
                <MediaPreviewHeader
                  selected={selected}
                  overlayVisible={overlayVisible}
                  setOverlayVisible={setOverlayVisible}
                />
                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  <div className="flex min-w-0 flex-col gap-5">
                    <MediaPreview
                      selected={selected}
                      media={media}
                      report={report}
                      overlayVisible={overlayVisible}
                      detectionObjects={detectionObjects}
                      failedInvocation={failedInvocation}
                      onNavigate={onNavigate}
                    />
                    <Separator />
                    <MediaMetadataPanel
                      selected={selected}
                      report={report}
                      detectionObjects={detectionObjects}
                      failedInvocation={failedInvocation}
                      onNavigate={onNavigate}
                    />
                  </div>
                </div>
              </>
            ) : (
              <Empty role="status">
                <EmptyMedia icon={FileImageIcon} />
                <EmptyTitle>
                  {media.length === 0
                    ? "No media available"
                    : "No matching media"}
                </EmptyTitle>
                <EmptyDescription>
                  {mediaEmptyMessage}
                </EmptyDescription>
              </Empty>
            )}
          </section>
        </div>
      </SidebarProvider>
    </section>
  );
}
