import type { Dispatch, SetStateAction } from "react";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from "skytrack-ui/attachment";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { DetailSection } from "./mission-insights-page-sections";
import { Badge } from "skytrack-ui/badge";
import { Toggle } from "skytrack-ui/toggle";
import { ToggleGroup } from "skytrack-ui/toggle-group";
import type { InsightMedia } from "./mission-insights-report-data";
import { statusLabel, SurveyContactSheetFrame } from "./mission-insights-report-shared";
import { LaptopIcon, WarningCircleIcon } from "@phosphor-icons/react";

export type MediaFilter = "all" | "images" | "videos" | "detections" | "remote";

export function matchesMediaFilter(item: InsightMedia, filter: MediaFilter) {
  if (filter === "images") return item.kind === "image";
  if (filter === "videos") return item.kind === "video";
  if (filter === "detections") return item.detectionCount > 0;
  if (filter === "remote") return item.availability !== "local";
  return true;
}

type MediaFilterItem = { value: MediaFilter; label: string };

export function MediaGallerySection({
  media,
  syntheticGallery,
  filter,
  setFilter,
  filterItems,
  visibleMedia,
  selectedId,
  setSelectedId,
  setOverlayVisible,
}: {
  media: InsightMedia[];
  syntheticGallery: boolean;
  filter: MediaFilter;
  setFilter: Dispatch<SetStateAction<MediaFilter>>;
  filterItems: ReadonlyArray<MediaFilterItem>;
  visibleMedia: InsightMedia[];
  selectedId: string;
  setSelectedId: Dispatch<SetStateAction<string>>;
  setOverlayVisible: Dispatch<SetStateAction<boolean>>;
}) {
  return (
      <DetailSection
        title={syntheticGallery ? "Survey image set" : "Captured media"}
        toolbar={
          <Badge
            className="rounded-(--radius)"
            count={`${media.length} ${
              syntheticGallery ? "preview frames" : "records"
            }`}
            status="secondary"
          />
        }
      >
        <Alert variant="info" role="note">
          <AlertDescription>
            {syntheticGallery
              ? "These four generated Leeville survey frames are illustrative previews, not captures from the selected run. The report fixture's 24 image artifact records are separate from these preview frames."
              : "These prototype capture images are illustrative drone-camera samples for this demo. They are not photos from the selected Mission Studio run."}
          </AlertDescription>
        </Alert>
        <div className="flex min-w-0 flex-col gap-4">
          <ToggleGroup
            aria-label="Filter media records"
            variant="outline"
            size="sm"
            value={[filter]}
            onValueChange={(value) => {
              if (!value[0]) return;
              const nextFilter = value[0] as MediaFilter;
              const nextVisible = media.filter((item) =>
                matchesMediaFilter(item, nextFilter),
              );
              setFilter(nextFilter);
              setSelectedId((current) =>
                nextVisible.some((item) => item.id === current)
                  ? current
                  : (nextVisible[0]?.id ?? ""),
              );
            }}
            className="flex max-w-full flex-wrap gap-2"
          >
            {filterItems.map((item) => (
              <Toggle key={item.value} value={item.value}>
                {item.label}
              </Toggle>
            ))}
          </ToggleGroup>
          <p className="m-0 text-(--muted-foreground)">
            {syntheticGallery
              ? `Showing ${visibleMedia.length} of ${media.length} generated preview frames.`
              : `Showing ${visibleMedia.length} of ${media.length} media records. Groups follow the producing action.`}
          </p>
          {visibleMedia.length ? (
            [...new Set(visibleMedia.map((item) => item.actionName))].map(
              (actionName) => (
                <section
                  key={actionName}
                  className="flex min-w-0 flex-col gap-3"
                  aria-label={actionName}
                >
                  <h3 className="m-0 text-lg font-medium text-(--foreground)">
                    {actionName}
                  </h3>
                  <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                    {visibleMedia
                      .filter((item) => item.actionName === actionName)
                      .map((item) => (
                        <Attachment
                          key={item.id}
                          orientation="vertical"
                          className={`min-w-0 overflow-hidden ${
                            selectedId === item.id
                              ? "border-primary ring-1 ring-primary"
                              : ""
                          }`}
                        >
                          <AttachmentMedia
                            variant="image"
                            className={
                              item.syntheticPreview
                                ? "relative aspect-video w-full"
                                : "relative w-full"
                            }
                          >
                            {item.imageUrl ? (
                              item.syntheticPreview &&
                              item.previewFrameIndex !== undefined ? (
                                <SurveyContactSheetFrame
                                  src={item.imageUrl}
                                  frameIndex={item.previewFrameIndex}
                                  alt={
                                    item.previewAlt ??
                                    `Generated survey preview ${item.name}`
                                  }
                                  className="size-full"
                                />
                              ) : (
                                <img
                                  src={item.imageUrl}
                                  alt={`Sample drone capture ${item.name}`}
                                  loading="lazy"
                                />
                              )
                            ) : item.availability === "remote_only" ? (
                              <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-(--muted) p-2 text-center text-(--muted-foreground)">
                                <LaptopIcon aria-hidden="true" />
                                <span>On Mission Computer</span>
                              </div>
                            ) : (
                              <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-(--muted) p-2 text-center text-(--muted-foreground)">
                                <WarningCircleIcon aria-hidden="true" />
                                <span>Preview unavailable</span>
                              </div>
                            )}
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>{item.name}</AttachmentTitle>
                            <AttachmentDescription>
                              {item.syntheticPreview
                                ? `Generated preview · Frame ${
                                    (item.previewFrameIndex ?? 0) + 1
                                  }`
                                : item.kind === "video"
                                  ? `Video poster · ${
                                      item.durationSeconds?.toFixed(1) ?? "—"
                                    } s`
                                  : `${item.captureTime?.toFixed(1) ?? "—"} s · ${
                                      item.width ?? "—"
                                    } × ${item.height ?? "—"}`}
                            </AttachmentDescription>
                          </AttachmentContent>
                          <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
                            <Badge
                              className="rounded-(--radius)"
                              count={
                                item.syntheticPreview
                                  ? "Generated preview"
                                  : item.availability === "local"
                                    ? "Local sample"
                                    : item.availability === "remote_only"
                                      ? "On Mission Computer"
                                      : item.availability === "missing"
                                        ? "File not written"
                                        : "Unavailable"
                              }
                              status={
                                item.syntheticPreview
                                  ? "secondary"
                                  : item.availability === "local"
                                    ? "success"
                                    : item.availability === "missing"
                                      ? "error"
                                      : "warning"
                              }
                            />
                            {!item.syntheticPreview &&
                            item.detectionCount > 0 ? (
                              <Badge
                                className="rounded-(--radius)"
                                count={`${item.detectionCount} detections`}
                                status="secondary"
                              />
                            ) : null}
                            {!item.syntheticPreview && item.processingError ? (
                              <Badge
                                className="rounded-(--radius)"
                                count="Model failed"
                                status="error"
                              />
                            ) : null}
                          </div>
                          <AttachmentTrigger
                            className="z-20"
                            aria-label={`Select ${item.name}, ${
                              item.syntheticPreview
                                ? "generated preview"
                                : item.availability === "local"
                                  ? "local sample"
                                  : statusLabel(item.availability)
                            }`}
                            aria-pressed={selectedId === item.id}
                            onClick={() => {
                              setSelectedId(item.id);
                              setOverlayVisible(true);
                            }}
                          />
                        </Attachment>
                      ))}
                  </div>
                </section>
              ),
            )
          ) : (
            <p className="m-0 text-(--muted-foreground)">
              No media records match this filter.
            </p>
          )}
        </div>
      </DetailSection>
  );
}
