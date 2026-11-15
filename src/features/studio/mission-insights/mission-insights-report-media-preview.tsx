import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsInSimpleIcon,
  ArrowsOutSimpleIcon,
  FastForwardIcon,
  LaptopIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { Button } from "skytrack-ui/button";
import { FieldRoot } from "skytrack-ui/field";
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "skytrack-ui/select";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "skytrack-ui/slider";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger,
} from "skytrack-ui/tooltip";
import type { MissionInsightsReportTab } from "@/features/studio/mission-report-url";
import type { InsightMedia, JsonRecord } from "./mission-insights-report-data";
import {
  asRecord,
  asRecords,
  modelForId,
  numberValue,
  reportArtifacts,
  textValue,
} from "./mission-insights-report-data";
import { coordinatePairs } from "./mission-insights-report-flight-path";
import { missionCapturePreview } from "./mission-insights-simulated-captures";
import { SurveyContactSheetFrame } from "./mission-insights-report-shared";

const videoSpeedOptions = ["0.5", "1", "2", "4"] as const;
const TIMELINE_MARKER_GAP_PX = 12;

type VideoTimelineEvent =
  | {
      type: "capture";
      id: string;
      item: InsightMedia;
      offset: number;
      position: number;
    }
  | {
      type: "detection";
      id: string;
      capture: InsightMedia;
      offset: number;
      position: number;
      count: number;
      classes: string[];
      modelName: string;
    };

type VideoTimelineGroup = {
  id: string;
  offset: number;
  position: number;
  events: VideoTimelineEvent[];
};

type VideoPlaybackFrame = {
  id: string;
  name: string;
  offset: number;
  imageUrl: string;
};

function formatVideoTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function VideoPreview({
  selected,
  media,
  report,
}: {
  selected: InsightMedia;
  media: InsightMedia[];
  report: JsonRecord;
}) {
  const duration = Math.max(selected.durationSeconds ?? 60, 1);
  const metadata = asRecord(selected.artifact.metadata);
  const start = numberValue(metadata.start_time_s);
  const end = start === null ? null : start + duration;
  const captureImages = useMemo(
    () =>
      media.filter(
        (item) => item.kind === "image" && item.captureTime !== null,
      ),
    [media],
  );
  const captureEvents = useMemo(
    () =>
      start === null
        ? []
        : captureImages.flatMap((item) => {
            const offset = item.captureTime! - start;
            if (offset < 0 || offset > duration) return [];
            return [{ type: "capture" as const, item, offset }];
          }),
    [captureImages, duration, start],
  );
  const flightPlaybackFrames = useMemo<VideoPlaybackFrame[]>(() => {
    const flightSamples = asRecords(asRecord(report.flight_path).samples);
    return asRecords(report.waypoints).flatMap((waypoint, index) => {
      const sample = flightSamples[index + 1];
      const sampleTime = numberValue(sample?.t_s);
      const imageUrl = missionCapturePreview(
        `art_leeville_video_frame_${String(index + 1).padStart(3, "0")}`,
      );
      if (start === null || sampleTime === null || !imageUrl) return [];
      const offset = sampleTime - start;
      if (offset < 0 || offset > duration) return [];
      return [
        {
          id: `flight-frame-${index + 1}`,
          name: `Waypoint ${textValue(waypoint.index, String(index + 1))}`,
          offset,
          imageUrl,
        },
      ];
    });
  }, [duration, report.flight_path, report.waypoints, start]);
  const capturePlaybackFrames = useMemo<VideoPlaybackFrame[]>(
    () =>
      captureEvents
        .flatMap(({ item, offset }) =>
          item.imageUrl
            ? [
                {
                  id: item.id,
                  name: item.name,
                  offset,
                  imageUrl: item.imageUrl,
                },
              ]
            : [],
        )
        .sort((a, b) => a.offset - b.offset),
    [captureEvents],
  );
  const playbackFrames =
    flightPlaybackFrames.length > 1
      ? flightPlaybackFrames
      : capturePlaybackFrames;
  const artifactsById = new Map(
    reportArtifacts(report).map((artifact) => [
      textValue(artifact.artifact_id),
      artifact,
    ]),
  );
  const detectionEvents =
    start === null || end === null
      ? []
      : asRecords(report.invocations).flatMap((invocation) => {
          if (invocation.result !== "with_results") return [];
          const startedAt = numberValue(invocation.started_s);
          if (startedAt === null || startedAt < start || startedAt > end)
            return [];
          const capture = captureImages.find(
            (item) => item.id === textValue(invocation.input_artifact_id),
          );
          if (!capture) return [];
          const detectionArtifact = artifactsById.get(
            textValue(invocation.output_artifact_id),
          );
          const detectionMetadata = asRecord(detectionArtifact?.metadata);
          const classes = asRecords(detectionMetadata.objects).map((object) => {
            const name = textValue(object.class, "Detected object");
            const confidence = numberValue(object.confidence);
            return confidence === null
              ? name
              : `${name} · ${confidence.toFixed(2)}`;
          });
          const model = modelForId(report, textValue(invocation.model_id));
          return [
            {
              type: "detection" as const,
              id: textValue(invocation.invocation_id),
              capture,
              offset: startedAt - start,
              count: numberValue(invocation.result_count) ?? 0,
              classes,
              modelName: textValue(model?.name, "AI model"),
            },
          ];
        });
  const events: VideoTimelineEvent[] = [
    ...captureEvents.map((event) => ({
      ...event,
      id: event.item.id,
      position: (event.offset / duration) * 100,
    })),
    ...detectionEvents.map((event) => ({
      ...event,
      position: (event.offset / duration) * 100,
    })),
  ].sort((a, b) => a.offset - b.offset);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const observer = new ResizeObserver(([entry]) => {
      setTimelineWidth(entry.contentRect.width);
    });
    observer.observe(timeline);
    return () => observer.disconnect();
  }, []);
  const timelineGroups = events.reduce<VideoTimelineGroup[]>(
    (groups, event) => {
      const lastGroup = groups[groups.length - 1];
      const pixelGap = lastGroup
        ? ((event.offset - lastGroup.offset) / duration) * timelineWidth
        : Infinity;
      const collides =
        lastGroup &&
        (event.offset === lastGroup.offset ||
          (timelineWidth > 0 && pixelGap < TIMELINE_MARKER_GAP_PX));
      if (lastGroup && collides) {
        lastGroup.events.push(event);
      } else {
        groups.push({
          id: event.id,
          offset: event.offset,
          position: event.position,
          events: [event],
        });
      }
      return groups;
    },
    [],
  );
  const detectionAreaCount = detectionEvents.reduce(
    (total, event) => total + event.count,
    0,
  );
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [fullscreen, setFullscreen] = useState(false);
  const [frameRevision, setFrameRevision] = useState(0);
  const previewRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const playbackImagesRef = useRef(new Map<string, HTMLImageElement>());
  const canPlay = playbackFrames.length > 1;

  useEffect(() => {
    let active = true;
    playbackImagesRef.current.clear();
    playbackFrames.forEach((frame) => {
      const image = new Image();
      image.onload = () => {
        playbackImagesRef.current.set(frame.id, image);
        if (active) setFrameRevision((revision) => revision + 1);
      };
      image.src = frame.imageUrl;
    });
    return () => {
      active = false;
    };
  }, [playbackFrames]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#111111";
    context.fillRect(0, 0, width, height);
    const loadedFrames = playbackFrames.filter((frame) =>
      playbackImagesRef.current.has(frame.id),
    );
    if (!loadedFrames.length) return;

    let frameIndex = loadedFrames.findIndex((frame) => frame.offset > time);
    if (frameIndex < 0) frameIndex = loadedFrames.length;
    const current = loadedFrames[Math.max(0, frameIndex - 1)];
    const next = loadedFrames[frameIndex];
    const interval = next ? Math.max(0.1, next.offset - current.offset) : 1;
    const fadeDuration = Math.min(1.2, Math.max(0.45, interval * 0.15));
    const transitionStart = next ? next.offset - fadeDuration : Infinity;
    const blend = next
      ? Math.max(0, Math.min(1, (time - transitionStart) / fadeDuration))
      : 0;

    const drawFrame = (
      frame: VideoPlaybackFrame,
      opacity: number,
      progress: number,
    ) => {
      if (opacity <= 0) return;
      const image = playbackImagesRef.current.get(frame.id);
      if (!image) return;
      const baseScale = Math.min(
        width / image.naturalWidth,
        height / image.naturalHeight,
      );
      const motion =
        1.08 + 0.05 * Math.sin(time * 0.28 + progress * Math.PI * 0.5);
      const drawWidth = image.naturalWidth * baseScale * motion;
      const drawHeight = image.naturalHeight * baseScale * motion;
      const driftX = Math.sin(time * 0.22) * width * 0.025;
      const driftY = Math.cos(time * 0.22) * height * 0.016;
      context.globalAlpha = opacity;
      context.drawImage(
        image,
        (width - drawWidth) / 2 + driftX,
        (height - drawHeight) / 2 + driftY,
        drawWidth,
        drawHeight,
      );
      context.globalAlpha = 1;
    };

    const progress = Math.max(
      0,
      Math.min(1, (time - current.offset) / interval),
    );
    drawFrame(current, 1 - blend, progress);
    if (next) drawFrame(next, blend, 0);
  }, [frameRevision, playbackFrames, time]);

  useEffect(() => {
    timeRef.current = 0;
    setTime(0);
    setPlaying(false);
  }, [selected.id]);

  useEffect(() => {
    if (!playing || !canPlay) return;
    let frame = 0;
    let previousTime = performance.now();
    const advance = (now: number) => {
      const elapsed = (now - previousTime) / 1000;
      previousTime = now;
      const nextTime = Math.min(
        duration,
        timeRef.current + elapsed * Number(speed),
      );
      timeRef.current = nextTime;
      setTime(nextTime);
      if (nextTime >= duration) setPlaying(false);
      else frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [canPlay, duration, playing, speed]);

  useEffect(() => {
    const updateFullscreen = () =>
      setFullscreen(document.fullscreenElement === previewRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const seek = (nextTime: number) => {
    const clampedTime = Math.min(duration, Math.max(0, nextTime));
    timeRef.current = clampedTime;
    setTime(clampedTime);
  };

  return (
    <section
      ref={previewRef}
      className="flex w-full min-w-0 flex-col overflow-hidden rounded-(--radius) border border-border bg-card"
      aria-label={`${selected.name} video preview`}
    >
      <div className="mx-auto aspect-video w-full max-w-2xl min-w-0 border-x border-border bg-muted">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${selected.name} playback showing ${playbackFrames.filter((frame) => frame.offset <= time).at(-1)?.name ?? playbackFrames[0]?.name ?? "preview frame"} at ${formatVideoTime(time)}`}
          className="size-full"
        />
      </div>
      <div className="min-w-0 border-t border-border px-3 pb-2 pt-1 text-card-foreground">
        <Slider
          value={time}
          min={0}
          max={duration}
          step={0.1}
          onValueChange={(value) =>
            seek(typeof value === "number" ? value : (value[0] ?? 0))
          }
          aria-label="Video timeline"
        >
          <SliderControl className="p-2">
            <SliderTrack>
              <SliderIndicator />
              <SliderThumb aria-label="Video time" />
            </SliderTrack>
          </SliderControl>
        </Slider>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={playing ? "Pause video" : "Play video"}
              aria-pressed={playing}
              disabled={!canPlay}
              onClick={() => {
                if (playing) setPlaying(false);
                else {
                  if (timeRef.current >= duration) seek(0);
                  setPlaying(true);
                }
              }}
            >
              {playing ? (
                <PauseIcon aria-hidden="true" />
              ) : (
                <PlayIcon aria-hidden="true" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Back 10 seconds"
              onClick={() => seek(timeRef.current - 10)}
            >
              <RewindIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Forward 10 seconds"
              onClick={() => seek(timeRef.current + 10)}
            >
              <FastForwardIcon aria-hidden="true" />
            </Button>
            <span className="ml-1 whitespace-nowrap text-xs tabular-nums sm:text-sm">
              {formatVideoTime(time)} / {formatVideoTime(duration)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Select
              value={speed}
              onValueChange={(value) => {
                if (typeof value === "string") setSpeed(value);
              }}
              items={videoSpeedOptions.map((value) => ({
                value,
                label: `${value}×`,
              }))}
            >
              <SelectTrigger
                className="h-8 min-w-0 border-0 bg-transparent px-1 shadow-none hover:bg-muted"
                aria-label="Playback speed"
              >
                <SelectValue>{speed}×</SelectValue>
                <SelectIcon className="text-muted-foreground" />
              </SelectTrigger>
              <SelectPortal>
                <SelectPositioner side="top" align="end" sideOffset={8}>
                  <SelectPopup>
                    <SelectList>
                      {videoSpeedOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          <SelectItemIndicator />
                          <SelectItemText>{value}×</SelectItemText>
                        </SelectItem>
                      ))}
                    </SelectList>
                  </SelectPopup>
                </SelectPositioner>
              </SelectPortal>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void previewRef.current?.requestFullscreen();
              }}
            >
              {fullscreen ? (
                <ArrowsInSimpleIcon aria-hidden="true" />
              ) : (
                <ArrowsOutSimpleIcon aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
        {events.length > 0 ? (
          <div className="flex flex-col gap-1.5 px-2 pb-2 pt-1">
            <div
              ref={timelineRef}
              className="relative h-7"
              role="group"
              aria-label={`${captureEvents.length} image captures and ${detectionEvents.length} detection events on the video timeline`}
            >
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
              <TooltipProvider>
                {timelineGroups.map((group) => {
                  const groupCaptures = group.events.filter(
                    (
                      event,
                    ): event is Extract<
                      VideoTimelineEvent,
                      { type: "capture" }
                    > => event.type === "capture",
                  );
                  const groupDetections = group.events.filter(
                    (
                      event,
                    ): event is Extract<
                      VideoTimelineEvent,
                      { type: "detection" }
                    > => event.type === "detection",
                  );
                  const hasBothTypes =
                    groupCaptures.length > 0 && groupDetections.length > 0;
                  const markerLabel = [
                    groupCaptures.length > 0
                      ? `${groupCaptures.length} image capture${groupCaptures.length === 1 ? "" : "s"}`
                      : "",
                    groupDetections.length > 0
                      ? `${groupDetections.length} detection${groupDetections.length === 1 ? "" : "s"}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" and ");
                  return (
                    <Tooltip key={group.id}>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className={`absolute top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center p-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${hasBothTypes ? "size-5 rounded-sm border border-border bg-popover" : "size-3 rounded-full"}`}
                            style={{ left: `${group.position}%` }}
                            aria-label={`${markerLabel} at ${group.offset.toFixed(1)} seconds`}
                            onClick={() => seek(group.offset)}
                          >
                            {hasBothTypes ? (
                              <span className="flex items-center gap-0.5">
                                <span
                                  aria-hidden="true"
                                  className="size-1.5 rounded-[2px] border border-muted-foreground bg-card"
                                />
                                <span
                                  aria-hidden="true"
                                  className="size-1.5 rounded-full border border-primary bg-primary"
                                />
                              </span>
                            ) : (
                              <span
                                aria-hidden="true"
                                className={`size-2 border ${
                                  groupCaptures.length > 0
                                    ? "rounded-[2px] border-muted-foreground bg-card"
                                    : "rounded-full border-primary bg-primary"
                                }`}
                              />
                            )}
                          </button>
                        }
                      />
                      <TooltipPortal>
                        <TooltipPositioner side="top" sideOffset={8}>
                          <TooltipPopup className="w-56 max-w-56 items-stretch rounded-(--radius) border border-border bg-popover p-2 text-popover-foreground shadow-md">
                            <TooltipArrow className="text-popover" />
                            <div className="flex flex-col gap-3">
                              {groupCaptures.map((captureEvent) => (
                                <div
                                  key={captureEvent.id}
                                  className="flex flex-col gap-2"
                                >
                                  {captureEvent.item.imageUrl ? (
                                    <img
                                      src={captureEvent.item.imageUrl}
                                      alt={`Preview of ${captureEvent.item.name}`}
                                      className="aspect-video w-full rounded-(--radius) border border-border object-cover"
                                    />
                                  ) : (
                                    <div className="grid aspect-video w-full place-items-center rounded-(--radius) bg-muted text-xs text-muted-foreground">
                                      Preview unavailable
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="m-0 truncate text-xs font-medium">
                                      {captureEvent.item.name}
                                    </p>
                                    <p className="m-0 text-xs text-muted-foreground">
                                      Image capture ·{" "}
                                      {captureEvent.offset.toFixed(1)} s
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {groupDetections.map((detectionEvent) => (
                                <div
                                  key={detectionEvent.id}
                                  className="flex flex-col gap-1"
                                >
                                  {hasBothTypes ? (
                                    <div className="h-px bg-border" />
                                  ) : null}
                                  <p className="m-0 text-xs font-medium">
                                    {detectionEvent.count} detection
                                    {detectionEvent.count === 1 ? "" : "s"}
                                  </p>
                                  <p className="m-0 text-xs text-muted-foreground">
                                    {detectionEvent.classes.length > 0
                                      ? detectionEvent.classes.join(" · ")
                                      : "Detection result recorded"}
                                  </p>
                                  <p className="m-0 text-xs text-muted-foreground">
                                    {detectionEvent.modelName} ·{" "}
                                    {detectionEvent.offset.toFixed(1)} s
                                  </p>
                                </div>
                              ))}
                            </div>
                          </TooltipPopup>
                        </TooltipPositioner>
                      </TooltipPortal>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
            <div className="flex items-center justify-between text-[0.6875rem] tabular-nums text-muted-foreground">
              <span>0:00</span>
              <span>{formatVideoTime(duration)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-[2px] border border-muted-foreground bg-card"
                  />
                  Image capture
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full border border-primary bg-primary"
                  />
                  Detection
                </span>
              </div>
              <span>
                {captureEvents.length} captures · {detectionEvents.length}{" "}
                detections · {detectionAreaCount} areas
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function MediaPreviewHeader({
  selected,
  overlayVisible,
  setOverlayVisible,
}: {
  selected: InsightMedia;
  overlayVisible: boolean;
  setOverlayVisible: (visible: boolean) => void;
}) {
  return (
    <header className="flex min-w-0 flex-row items-center justify-between gap-3 border-b border-border px-6 py-4">
      <div className="h6 min-w-0 w-full truncate">{selected.name}</div>
      {selected.detectionCount > 0 && selected.kind === "image" ? (
        <FieldRoot className="w-auto shrink-0 flex-row items-center gap-2">
          Show detections
          <Switch
            checked={overlayVisible}
            onCheckedChange={setOverlayVisible}
            aria-label="Show detection overlay"
          >
            <SwitchThumb />
          </Switch>
        </FieldRoot>
      ) : null}
    </header>
  );
}

export function MediaPreview({
  selected,
  media,
  report,
  overlayVisible,
  detectionObjects,
  failedInvocation,
  onNavigate,
}: {
  selected: InsightMedia;
  media: InsightMedia[];
  report: JsonRecord;
  overlayVisible: boolean;
  detectionObjects: JsonRecord[];
  failedInvocation: boolean;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-label={`${selected.name} preview`}
    >
      {selected.imageUrl && selected.kind === "image" ? (
        <figure className="relative m-0 aspect-video min-w-0 w-full max-w-2xl mx-auto overflow-hidden rounded-(--radius) border border-border bg-(--muted)">
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
              alt={`Selected drone image ${selected.name}`}
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
              aria-label={`${detectionObjects.length} detection regions`}
            >
              {detectionObjects.map((item, index) => {
                const polygon = coordinatePairs(item.polygon);
                if (polygon.length < 3) return null;
                const points = polygon.map(([x, y]) => `${x},${y}`).join(" ");
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
                      {textValue(item.class)} detection ·{" "}
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
                ? "m-0 p-2 text-muted-foreground"
                : "sr-only"
            }
          >
            {selected.syntheticPreview
              ? "Leeville survey preview"
              : `Capture, ${selected.width ?? "—"} by ${
                  selected.height ?? "—"
                } pixels.`}
          </figcaption>
        </figure>
      ) : selected.imageUrl && selected.kind === "video" ? (
        <figure className="m-0 flex min-w-0 flex-col gap-3">
          <VideoPreview selected={selected} media={media} report={report} />
          {asRecord(selected.artifact.metadata).truncated ? (
            <Alert variant="warning">
              <AlertDescription>Recording is truncated.</AlertDescription>
            </Alert>
          ) : null}
        </figure>
      ) : (
        <Alert
          variant={
            selected.availability === "missing" ? "destructive" : "warning"
          }
          role="status"
        >
          {selected.availability === "remote_only" ? (
            <LaptopIcon className="size-5 shrink-0" aria-hidden="true" />
          ) : (
            <WarningCircleIcon className="size-5 shrink-0" aria-hidden="true" />
          )}
          <AlertDescription>
            {selected.availability === "remote_only"
              ? "Stored on the Mission Computer."
              : selected.availability === "missing"
                ? "File not written."
                : "No local preview is available for this media record."}
          </AlertDescription>
        </Alert>
      )}
      {failedInvocation ? (
        <Alert variant="destructive" role="status">
          <WarningCircleIcon className="size-5 shrink-0" aria-hidden="true" />
          <AlertDescription>
            Model invocation failed for this capture.{" "}
            <button
              type="button"
              className="cursor-pointer text-primary underline hover:text-primary/80"
              onClick={() => onNavigate("ai-models")}
            >
              Review AI Models
            </button>
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
