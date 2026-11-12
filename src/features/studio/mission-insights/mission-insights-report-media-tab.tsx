import { useEffect, useMemo, useState } from "react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import type { MissionInsightsReportTab } from "@/features/studio/mission-report-url";
import { DetailSection } from "./mission-insights-page-sections";
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
import { Separator } from "skytrack-ui/separator";
import {
  asRecord,
  asRecords,
  numberValue,
  reportArtifacts,
  reportForSample,
  sampleActions,
  sampleGalleryMedia,
  textValue,
  type InsightMedia,
  type JsonRecord,
} from "./mission-insights-report-data";
import { statusLabel } from "./mission-insights-report-shared";
import type { MissionInsightSample } from "./mission-insights-data";
import {
  MediaBrowserFileList,
  MediaBrowserFilters,
  MediaFileSearchBar,
  matchesMediaFilter,
  type MediaBrowserSelection,
  type MediaFilter,
} from "./mission-insights-report-media-gallery";
import {
  MediaFilesSection,
  FileDetailsPanel,
  sanitizedReportPath,
} from "./mission-insights-report-media-files";
import { MediaMetadataPanel } from "./mission-insights-report-media-metadata";
import { MediaPreview } from "./mission-insights-report-media-preview";

function initialMediaId(media: InsightMedia[], sample: MissionInsightSample) {
  const preferred =
    media.find((item) => item.syntheticPreview) ??
    (sample.key === "simulation-succeeded"
      ? media.find((item) => item.name === "000005.jpg")
      : media.find((item) => item.kind === "image" && item.imageUrl));
  return preferred?.id ?? media[0]?.id ?? "";
}

export function MediaFilesTab({
  sample,
  selectedMediaId,
  onNavigate,
}: {
  sample: MissionInsightSample;
  selectedMediaId: string | null;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  const report = reportForSample(sample);
  const [browserSelection, setBrowserSelection] =
    useState<MediaBrowserSelection>("all");
  const [selectionBeforeDetections, setSelectionBeforeDetections] =
    useState<MediaFilter>("all");
  const [selectedKind, setSelectedKind] = useState("all");
  const [query, setQuery] = useState("");
  const media = useMemo(() => sampleGalleryMedia(sample), [sample]);
  const syntheticGallery = media.some((item) => item.syntheticPreview);
  const [selectedId, setSelectedId] = useState(() =>
    initialMediaId(media, sample),
  );
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState("");

  useEffect(() => {
    setSelectedId(
      selectedMediaId && media.some((item) => item.id === selectedMediaId)
        ? selectedMediaId
        : initialMediaId(media, sample),
    );
    setSelectedFileId("");
    setBrowserSelection("all");
    setSelectedKind("all");
    setQuery("");
  }, [media, sample, selectedMediaId]);

  const visibleMedia = useMemo(
    () =>
      media
        .filter((item) =>
          browserSelection === "other-files"
            ? false
            : matchesMediaFilter(item, browserSelection),
        )
        .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())),
    [browserSelection, media, query],
  );
  const selected = media.find((item) => item.id === selectedId) ?? null;
  useEffect(() => {
    if (browserSelection === "other-files") return;
    setSelectedId((current) =>
      visibleMedia.some((item) => item.id === current)
        ? current
        : (visibleMedia[0]?.id ?? ""),
    );
  }, [browserSelection, visibleMedia]);
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
      selectedKind === "all"
        ? files
        : files.filter((artifact) => textValue(artifact.type) === selectedKind),
    [files, selectedKind],
  );
  const searchedFiles = useMemo(
    () => {
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) return visibleFiles;
      return visibleFiles.filter((artifact) => {
        const metadata = asRecord(artifact.metadata);
        const file = asRecord(metadata.file);
        const fileName = textValue(
          file.name,
          sanitizedReportPath(artifact).split("/").at(-1) ?? "",
        );
        return fileName.toLowerCase().includes(normalizedQuery);
      });
    },
    [query, visibleFiles],
  );
  const selectedFile =
    searchedFiles.find((artifact) => artifact.artifact_id === selectedFileId) ?? null;
  const kindOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of files) {
      const kind = textValue(file.type);
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    return [
      { value: "all", label: `All kinds ${files.length}` },
      ...[...counts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([kind, count]) => ({ value: kind, label: `${statusLabel(kind)} ${count}` })),
    ];
  }, [files]);
  const actionMap = new Map(
    sampleActions(report).map((action) => [
      textValue(action.action_id),
      action,
    ]),
  );
  const selectedAction = selected
    ? actionMap.get(
        textValue(asRecord(selected.artifact.context).action_id, ""),
      )
    : null;
  const failedInvocation = selected
    ? asRecords(report.invocations).some(
        (invocation) =>
          invocation.input_artifact_id === selected.id &&
          invocation.result === "failed",
      )
    : false;
  const browseGroups: ReadonlyArray<{
    label: string;
    items: ReadonlyArray<{ value: MediaBrowserSelection; label: string }>;
  }> = [
    {
      label: "Media",
      items: [
        { value: "all", label: `All ${media.length}` },
        { value: "images", label: `Images ${media.filter((item) => item.kind === "image").length}` },
        { value: "videos", label: `Videos ${media.filter((item) => item.kind === "video").length}` },
      ],
    },
    {
      label: "Local",
      items: [{ value: "other-files", label: `Local files ${files.length}` }],
    },
    {
      label: "Mission Computer",
      items: [{ value: "remote", label: `On Mission Computer ${media.filter((item) => item.availability !== "local").length}` }],
    },
  ];

  function changeBrowserSelection(nextSelection: MediaBrowserSelection) {
    setBrowserSelection(nextSelection);
    if (nextSelection === "other-files") return;
    const nextVisible = media.filter((item) =>
      matchesMediaFilter(item, nextSelection),
    );
    setSelectedId((current) =>
      nextVisible.some((item) => item.id === current)
        ? current
        : (nextVisible[0]?.id ?? ""),
    );
  }

  function toggleDetectionFilter() {
    if (browserSelection === "detections") {
      setBrowserSelection(selectionBeforeDetections);
      return;
    }
    setSelectionBeforeDetections(
      browserSelection === "other-files" ? "all" : browserSelection,
    );
    setBrowserSelection("detections");
  }

  const detectionFilterButton = (
    <Button
      type="button"
      size="sm"
      variant={browserSelection === "detections" ? "secondary" : "outline"}
      aria-pressed={browserSelection === "detections"}
      onClick={toggleDetectionFilter}
    >
      With detections {media.filter((item) => item.detectionCount > 0).length}
    </Button>
  );
  const kindFilterButton = (
    <Menu>
      <MenuTrigger
        aria-label={`Filter by kind${selectedKind === "all" ? "" : `, ${statusLabel(selectedKind)}`}`}
        render={
          <Button type="button" variant={selectedKind === "all" ? "outline" : "secondary"} size="sm" />
        }
      >
        Kind{selectedKind === "all" ? "" : ` · ${statusLabel(selectedKind)}`}
        <CaretDownIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuPortal>
        <MenuPositioner side="bottom" align="end" sideOffset={4}>
          <MenuPopup aria-label="Filter files by kind" className="max-h-[min(60vh,32rem)] overflow-y-auto">
            <MenuRadioGroup
              value={selectedKind}
              onValueChange={(value) => {
                if (value) {
                  setSelectedKind(value);
                  setSelectedFileId("");
                }
              }}
            >
              {kindOptions.map((item) => (
                <MenuRadioItem key={item.value} value={item.value}>
                  <MenuRadioItemIndicator>
                    <CheckIcon aria-hidden="true" className="size-3.5" />
                  </MenuRadioItemIndicator>
                  {item.label}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </Menu>
  );
  const searchBar = (
    <MediaFileSearchBar
      query={query}
      onQueryChange={setQuery}
      trailingFilter={browserSelection === "other-files" ? kindFilterButton : detectionFilterButton}
    />
  );

  return (
    <section className="flex min-w-0 flex-col" aria-label="Media & Files">
        <div className="grid min-w-0 grid-cols-1 divide-y divide-border xl:grid-cols-[15rem_minmax(20rem,0.85fr)_minmax(0,1.45fr)] xl:divide-x xl:divide-y-0">
          <MediaBrowserFilters
            selection={browserSelection === "detections" ? selectionBeforeDetections : browserSelection}
            onChange={changeBrowserSelection}
            groups={browseGroups}
          />
          <div className="min-w-0">
            {browserSelection === "other-files" ? (
              <div className="min-w-0 p-4">
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
                syntheticGallery={syntheticGallery}
                selectedId={selectedId}
                searchBar={searchBar}
                onSelect={(id) => {
                  setSelectedId(id);
                  setOverlayVisible(true);
                }}
              />
            )}
          </div>
          <section
            className="flex min-w-0 flex-col gap-5 p-4"
            aria-label={browserSelection === "other-files" ? "Selected file details" : "Selected media preview and details"}
          >
            {browserSelection === "other-files" ? (
              <FileDetailsPanel
                file={selectedFile}
                onClear={() => setSelectedFileId("")}
              />
            ) : selected ? (
              <>
                <MediaPreview
                  selected={selected}
                  overlayVisible={overlayVisible}
                  setOverlayVisible={setOverlayVisible}
                  detectionObjects={detectionObjects}
                  failedInvocation={failedInvocation}
                  onNavigate={onNavigate}
                />
                <Separator />
                <MediaMetadataPanel
                  selected={selected}
                  detectionObjects={detectionObjects}
                  failedInvocation={failedInvocation}
                  selectedAction={Boolean(selectedAction)}
                  onNavigate={onNavigate}
                />
                {selected.kind === "video" ? (
                  <>
                    <Separator />
                    <MediaVideoTimeline
                      selected={selected}
                      media={media}
                      report={report}
                      onSelect={setSelectedId}
                    />
                  </>
                ) : null}
              </>
            ) : (
              <p className="m-0 py-8 text-muted-foreground">
                Select a media item to inspect its preview and metadata.
              </p>
            )}
          </section>
        </div>
    </section>
  );
}

function MediaVideoTimeline({
  selected,
  media,
  report,
  onSelect,
}: {
  selected: InsightMedia;
  media: InsightMedia[];
  report: JsonRecord;
  onSelect: (id: string) => void;
}) {
  const metadata = asRecord(selected.artifact.metadata);
  const start = numberValue(metadata.start_time_s);
  const recordedDuration = numberValue(metadata.duration_ms);
  const expectedDuration =
    numberValue(metadata.expected_duration_ms) ?? recordedDuration;
  if (
    start === null ||
    recordedDuration === null ||
    expectedDuration === null ||
    expectedDuration <= 0
  ) {
    return (
      <DetailSection title="Video timeline">
        <p className="m-0 text-muted-foreground">
          No timeline values available.
        </p>
      </DetailSection>
    );
  }
  const images = media.filter(
    (item) => item.kind === "image" && item.captureTime !== null,
  );
  const invocations = asRecords(report.invocations);
  const recordedSeconds = recordedDuration / 1000;
  const expectedSeconds = expectedDuration / 1000;
  const truncated = metadata.truncated === true;
  const captureMarkers = images.flatMap((item) => {
    const offset = item.captureTime! - start;
    if (offset < 0 || offset > expectedSeconds) return [];
    return [
      {
        item,
        offset,
        position: Math.max(0, Math.min(100, (offset / expectedSeconds) * 100)),
      },
    ];
  });
  const invocationMarkers = invocations.flatMap((invocation) => {
    if (invocation.result !== "with_results") return [];
    const time = numberValue(invocation.started_s);
    if (time === null || time < start || time > start + expectedSeconds)
      return [];
    return [
      {
        time,
        position: Math.max(
          0,
          Math.min(100, ((time - start) / expectedSeconds) * 100),
        ),
      },
    ];
  });

  return (
    <DetailSection
      className="xl:col-span-2"
      title="Video timeline"
      toolbar={
        <Badge
          className="rounded-(--radius)"
          count={truncated ? "Truncated" : `${recordedSeconds.toFixed(1)} s`}
          status={truncated ? "warning" : "secondary"}
        />
      }
    >
      <p className="m-0 text-muted-foreground">
        {truncated
          ? `Recorded ${recordedSeconds.toFixed(1)} s of ${expectedSeconds.toFixed(1)} s. Remaining span has no recorded video.`
          : `Recorded ${recordedSeconds.toFixed(1)} s from ${start.toFixed(1)} s.`}{" "}
      </p>
      <div
        className="relative h-14 px-1"
        role="group"
        aria-label="Video capture and model invocation timeline"
      >
        <div className="absolute inset-x-1 top-6 h-2 overflow-hidden rounded-(--radius) border border-border bg-(--muted)">
          <div
            className="h-full bg-(--info)"
            style={{
              width: `${Math.min(100, (recordedSeconds / expectedSeconds) * 100)}%`,
            }}
          />
          {truncated ? (
            <div
              className="absolute inset-y-0 right-0 border-l border-dashed border-warning bg-(--warning)/10"
              style={{
                width: `${Math.max(0, 100 - (recordedSeconds / expectedSeconds) * 100)}%`,
              }}
            />
          ) : null}
        </div>
        {captureMarkers.map(({ item, offset, position }) => (
          <Button
            key={item.id}
            variant="outline"
            size="icon-xs"
            aria-label={`Open capture ${item.name} at ${offset.toFixed(1)} seconds`}
            title={`${item.name} · ${offset.toFixed(1)} s`}
            className="absolute top-4 z-10 -translate-x-1/2 rounded-full border-warning bg-(--card)"
            style={{ left: `${position}%` }}
            onClick={() => onSelect(item.id)}
          >
            <span className="sr-only">Open capture {item.name}</span>
          </Button>
        ))}
        {invocationMarkers.map((marker, index) => (
          <span
            key={`inv-${index}`}
            title={`Model invocation at ${(marker.time - start).toFixed(1)} s`}
            aria-label={`Model invocation at ${(marker.time - start).toFixed(1)} seconds`}
            className="absolute top-7 z-10 size-2 -translate-x-1/2 rounded-full bg-(--primary)"
            style={{ left: `${marker.position}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
        <span>
          <span
            aria-hidden="true"
            className="mr-1 inline-block size-2 rounded-full bg-(--info)"
          />
          Recorded video
        </span>
        {truncated ? (
          <span>
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-2 border border-dashed border-warning"
            />
            Not recorded
          </span>
        ) : null}
        <span>
          <span
            aria-hidden="true"
            className="mr-1 inline-block size-2 rounded-full border border-warning"
          />
          Image capture · select to inspect
        </span>
        {invocationMarkers.length ? (
          <span>
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-2 rounded-full bg-(--primary)"
            />
            Model invocation
          </span>
        ) : null}
      </div>
    </DetailSection>
  );
}
