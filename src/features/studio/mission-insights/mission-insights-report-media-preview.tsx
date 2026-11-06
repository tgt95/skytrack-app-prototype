import { LaptopIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { Button } from "skytrack-ui/button";
import { FieldLabel, FieldRoot } from "skytrack-ui/field";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
import type { MissionInsightsReportTab } from "@/features/studio/mission-report-url";
import type { InsightMedia, JsonRecord } from "./mission-insights-report-data";
import { asRecord, numberValue, textValue } from "./mission-insights-report-data";
import { coordinatePairs } from "./mission-insights-report-flight-path";
import { SurveyContactSheetFrame } from "./mission-insights-report-shared";

export function MediaPreview({
  selected,
  overlayVisible,
  setOverlayVisible,
  detectionObjects,
  failedInvocation,
  onNavigate,
}: {
  selected: InsightMedia;
  overlayVisible: boolean;
  setOverlayVisible: (visible: boolean) => void;
  detectionObjects: JsonRecord[];
  failedInvocation: boolean;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  return (
            <section
              className="flex min-w-0 flex-col gap-3"
              aria-label={`${selected.name} preview`}
            >
              <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <h3 className="m-0 text-lg font-medium text-foreground">
                  {selected.name}
                </h3>
                {selected.detectionCount > 0 && selected.kind === "image" ? (
                  <FieldRoot className="flex items-center gap-2">
                    <Switch
                      checked={overlayVisible}
                      onCheckedChange={setOverlayVisible}
                      aria-label="Show detection overlay"
                    >
                      <SwitchThumb />
                    </Switch>
                    <FieldLabel>Show detections</FieldLabel>
                  </FieldRoot>
                ) : null}
              </header>
              {selected.imageUrl && selected.kind === "image" ? (
                <figure className="relative m-0 aspect-video min-w-0 overflow-hidden rounded-(--radius) border border-border bg-(--muted)">
                  {selected.syntheticPreview &&
                  selected.previewFrameIndex !== undefined ? (
                    <SurveyContactSheetFrame
                      src={selected.imageUrl}
                      frameIndex={selected.previewFrameIndex}
                      alt={
                        selected.previewAlt ??
                        `Generated survey preview ${selected.name}`
                      }
                      className="size-full"
                    />
                  ) : (
                    <img
                      src={selected.imageUrl}
                      alt={`Selected sample drone image ${selected.name}`}
                      className="size-full object-contain"
                    />
                  )}
                  {!selected.syntheticPreview &&
                  overlayVisible &&
                  detectionObjects.length ? (
                    <svg
                      className="absolute inset-0 size-full"
                      viewBox="0 0 1 1"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`${detectionObjects.length} sample detection regions`}
                    >
                      {detectionObjects.map((item, index) => {
                        const polygon = coordinatePairs(item.polygon);
                        if (polygon.length < 3) return null;
                        const points = polygon
                          .map(([x, y]) => `${x},${y}`)
                          .join(" ");
                        return (
                          <polygon
                            key={`${item.class}-${index}`}
                            points={points}
                            fill="var(--warning)"
                            fillOpacity="0.16"
                            stroke="var(--warning)"
                            strokeWidth="0.004"
                            vectorEffect="non-scaling-stroke"
                          >
                            <title>
                              {textValue(item.class)} sample detection ·{" "}
                              {numberValue(item.confidence)?.toFixed(2) ?? "—"}
                            </title>
                          </polygon>
                        );
                      })}
                    </svg>
                  ) : null}
                  <figcaption
                    className={
                      selected.syntheticPreview
                        ? "m-0 p-2 text-(--muted-foreground)"
                        : "sr-only"
                    }
                  >
                    {selected.syntheticPreview
                      ? "Generated Leeville survey preview; capture metadata and detection results are not supplied."
                      : `Illustrative sample capture, ${
                          selected.width ?? "—"
                        } by ${selected.height ?? "—"} pixels.`}
                  </figcaption>
                </figure>
              ) : selected.imageUrl && selected.kind === "video" ? (
                <figure className="m-0 flex min-w-0 flex-col gap-3">
                  <div className="relative aspect-video overflow-hidden rounded-(--radius) border border-border bg-(--muted)">
                    <img
                      src={selected.imageUrl}
                      alt={`${selected.name} sample video poster`}
                      className="size-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-(--background)/90 p-3 text-foreground">
                      Poster only · video playback is not included in this demo.
                    </div>
                  </div>
                  {asRecord(selected.artifact.metadata).truncated ? (
                    <Alert variant="warning">
                      <AlertDescription>
                        Recording is truncated. Only the captured poster is
                        shown in this demo preview.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </figure>
              ) : (
                <Alert
                  variant={
                    selected.availability === "missing"
                      ? "destructive"
                      : "warning"
                  }
                  role="status"
                >
                  {selected.availability === "remote_only" ? (
                    <LaptopIcon
                      className="size-5 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <WarningCircleIcon
                      className="size-5 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <AlertDescription>
                    {selected.availability === "remote_only"
                      ? "Stored on the Mission Computer. No preview or remote download is available in this local browser demo."
                      : selected.availability === "missing"
                        ? "No preview — the prototype marks this file as not written."
                        : "No local preview is available for this media record."}
                  </AlertDescription>
                </Alert>
              )}
              {failedInvocation ? (
                <Alert variant="destructive" role="status">
                  <WarningCircleIcon
                    className="size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <AlertDescription>
                    Model invocation failed for this capture.{" "}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onNavigate("ai-models")}
                    >
                      Review AI Models
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
            </section>
  );
}
