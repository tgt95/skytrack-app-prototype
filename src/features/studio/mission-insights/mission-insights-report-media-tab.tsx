import { useEffect, useMemo, useState } from "react";
import type { MissionInsightsReportTab } from "../mission-report-url";
import { DetailSection } from "./mission-insights-page-sections";
import { asRecord, asRecords, reportArtifacts, reportForSample, sampleActions, sampleGalleryMedia, textValue, type InsightMedia } from "./mission-insights-report-data";
import type { MissionInsightSample } from "./mission-insights-data";
import { MediaGallerySection, matchesMediaFilter, type MediaFilter } from "./mission-insights-report-media-gallery";
import { MediaFilesSection, FileDetailsDrawer } from "./mission-insights-report-media-files";
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
  onNavigate,
  onSelectionChange,
}: {
  sample: MissionInsightSample;
  onNavigate: (tab: MissionInsightsReportTab) => void;
  onSelectionChange: (item: InsightMedia | null) => void;
}) {
  const report = reportForSample(sample);
  const [filter, setFilter] = useState<MediaFilter>("all");
  const media = useMemo(() => sampleGalleryMedia(sample), [sample]);
  const syntheticGallery = media.some((item) => item.syntheticPreview);
  const [selectedId, setSelectedId] = useState(() =>
    initialMediaId(media, sample),
  );
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [fileDrawerOpen, setFileDrawerOpen] = useState(false);

  useEffect(() => {
    setSelectedId(initialMediaId(media, sample));
    setSelectedFileId("");
    setFilter("all");
  }, [media, sample]);

  const visibleMedia = media.filter((item) => matchesMediaFilter(item, filter));
  const selected = media.find((item) => item.id === selectedId) ?? null;
  useEffect(() => {
    onSelectionChange(selected);
  }, [onSelectionChange, selected]);
  const selectedDetection = selected?.detection
    ? asRecord(selected.detection.metadata)
    : {};
  const detectionObjects = asRecords(selectedDetection.objects);
  const files = reportArtifacts(report).filter(
    (artifact) => artifact.type !== "image" && artifact.type !== "video",
  );
  const selectedFile =
    files.find((artifact) => artifact.artifact_id === selectedFileId) ?? null;
  const actionMap = new Map(
    sampleActions(report).map((action) => [
      textValue(action.action_id),
      action,
    ]),
  );
  const selectedAction = selected
    ? actionMap.get(textValue(asRecord(selected.artifact.context).action_id, ""))
    : null;
  const failedInvocation = selected
    ? asRecords(report.invocations).some(
        (invocation) =>
          invocation.input_artifact_id === selected.id &&
          invocation.result === "failed",
      )
    : false;
  const filterItems: ReadonlyArray<{ value: MediaFilter; label: string }> = [
    { value: "all", label: `All ${media.length}` },
    {
      value: "images",
      label: `Images ${media.filter((item) => item.kind === "image").length}`,
    },
    {
      value: "videos",
      label: `Videos ${media.filter((item) => item.kind === "video").length}`,
    },
    {
      value: "detections",
      label: `With detections ${media.filter((item) => item.detectionCount > 0).length}`,
    },
    {
      value: "remote",
      label: `Not on this computer ${media.filter((item) => item.availability !== "local").length}`,
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MediaGallerySection
        media={media}
        syntheticGallery={syntheticGallery}
        filter={filter}
        setFilter={setFilter}
        filterItems={filterItems}
        visibleMedia={visibleMedia}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        setOverlayVisible={setOverlayVisible}
      />
      <DetailSection title="Media details">
        {selected ? (
          <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(28rem,0.8fr)]">
            <MediaPreview
              selected={selected}
              overlayVisible={overlayVisible}
              setOverlayVisible={setOverlayVisible}
              detectionObjects={detectionObjects}
              failedInvocation={failedInvocation}
              onNavigate={onNavigate}
            />
            <MediaMetadataPanel
              selected={selected}
              detectionObjects={detectionObjects}
              failedInvocation={failedInvocation}
              selectedAction={Boolean(selectedAction)}
              onNavigate={onNavigate}
            />
          </div>
        ) : (
          <p className="m-0 text-(--muted-foreground)">
            Select a media item to inspect its sample metadata and availability.
          </p>
        )}
      </DetailSection>
      <MediaFilesSection
        files={files}
        onInspect={(id) => {
          setSelectedFileId(id);
          setFileDrawerOpen(true);
        }}
      />
      <FileDetailsDrawer
        file={selectedFile}
        open={fileDrawerOpen}
        onOpenChange={setFileDrawerOpen}
      />
    </div>
  );
}
