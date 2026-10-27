import { useEffect, useMemo, useState } from "react";
import { Badge } from "skytrack-ui/badge";
import MissionPreviewControls from "./mission-preview-controls";
import MissionPreviewMap from "./mission-preview-map";
import type { StudioMission } from "../../domain/mission-model";
import {
  buildPreview,
  previewPhotoCaptureAt,
  previewPositionAt,
} from "./mission-preview-model";
export {
  previewPhotoCaptureAt,
  previewPositionAt,
} from "./mission-preview-model";

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export interface MissionPreviewProps {
  mission: StudioMission;
  onSelectWaypoint: (id: string) => void;
  previewPositionRef: { current: { x: number; y: number; z: number } | null };
  previewCaptureRef: { current: string | null };
}

export default function MissionPreview({
  mission,
  onSelectWaypoint,
  previewPositionRef,
  previewCaptureRef,
}: MissionPreviewProps) {
  const [showPhotoScanDemo, setShowPhotoScanDemo] = useState(true);
  const preview = useMemo(
    () => buildPreview(mission, showPhotoScanDemo),
    [mission, showPhotoScanDemo],
  );
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    setTime((current) => Math.min(current, preview.duration));
    if (preview.duration === 0) setPlaying(false);
  }, [preview.duration]);

  useEffect(() => {
    if (time >= preview.duration) setPlaying(false);
  }, [time, preview.duration]);

  useEffect(() => {
    if (!playing || preview.duration === 0) return;
    const timer = window.setInterval(() => {
      setTime((current) => {
        return Math.min(preview.duration, current + 0.1 * speed);
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, preview.duration, speed]);

  const dronePosition = useMemo(
    () =>
      preview.transferBlocked
        ? null
        : previewPositionAt(mission, time, showPhotoScanDemo),
    [mission, preview.transferBlocked, time, showPhotoScanDemo],
  );
  const activePhotoCaptureId = useMemo(
    () =>
      preview.transferBlocked
        ? null
        : previewPhotoCaptureAt(mission, time, showPhotoScanDemo),
    [mission, preview.transferBlocked, time, showPhotoScanDemo],
  );
  useEffect(() => {
    previewPositionRef.current = dronePosition;
  }, [dronePosition, previewPositionRef]);
  useEffect(() => {
    previewCaptureRef.current = activePhotoCaptureId;
  }, [activePhotoCaptureId, previewCaptureRef]);
  useEffect(
    () => () => {
      previewPositionRef.current = null;
      previewCaptureRef.current = null;
    },
    [previewPositionRef, previewCaptureRef],
  );

  const togglePlayback = () => {
    if (time >= preview.duration) setTime(0);
    setPlaying((current) => !current);
  };
  const scrubToTime = (next: number | readonly number[]) => {
    const first = Array.isArray(next) ? next[0] : next;
    if (
      typeof first !== "number" ||
      !Number.isFinite(first) ||
      preview.duration <= 0
    )
      return;
    setPlaying(false);
    setTime(
      Math.min(
        Math.max((first / 1000) * preview.duration, 0),
        preview.duration,
      ),
    );
  };

  const activeEvent = [...preview.events]
    .reverse()
    .find((event) => event.time <= time);
  const scrub =
    preview.duration > 0 ? Math.round((time / preview.duration) * 1000) : 0;
  const activeWaypointId = activeEvent?.waypoint.id ?? null;

  return (
    <section
      className="ms-preview flex flex-col gap-[1rem] w-full min-w-0 box-border max-w-[60rem] m-[0_auto] text-(--foreground) *:min-w-0 *:box-border"
      aria-label="Mission route preview"
      data-testid="ms-preview"
    >
      {/* <header className='ms-preview-header'>
        <div>
          <h2 className='sub-heading ms-preview-title'>Flight preview</h2>
          <p className='ms-preview-note'>Approximate route playback · no drone control</p>
        </div>
        <span className='ms-preview-duration' aria-label={`Estimated duration ${formatTime(preview.duration)}`}>
          {formatTime(time)} / {formatTime(preview.duration)}
        </span>
      </header> */}

      <MissionPreviewMap
        mission={mission}
        rows={preview.rows}
        dronePosition={dronePosition}
      />

      <MissionPreviewControls
        showPhotoScanDemo={showPhotoScanDemo}
        onPhotoScanDemoChange={setShowPhotoScanDemo}
        playing={playing}
        onPlayToggle={togglePlayback}
        scrub={scrub}
        duration={preview.duration}
        speed={speed}
        onScrubChange={scrubToTime}
        onSpeedChange={setSpeed}
        formattedTime={formatTime(time)}
        formattedDuration={formatTime(preview.duration)}
      />

      <p
        className=" m-0 p-[0.75rem] [border:0.0625rem_solid_var(--border)] rounded-[0.4375rem] bg-(--card) text-[0.875rem]"
        aria-live="polite"
        data-testid="ms-preview-current-event"
      >
        {preview.transferBlocked
          ? "Preview unavailable: an Avoid zone blocks a route transfer. Adjust the route or Avoid zone to preview flight timing."
          : (activeEvent?.label ??
            (preview.rows.length
              ? "Take-off at Home"
              : "Add waypoints to preview this mission."))}
      </p>

      <p
        className=" m-[0.25rem_0_0] text-(--muted-foreground) text-[0.75rem]"
        data-testid="ms-preview-estimate"
      >
        For runnable missions, estimate follows the flight path from Home,
        including transfers, Area traversal and landing.{" "}
        {showPhotoScanDemo ? "Photo adds 1.5 s" : "Photo dwell is skipped"};
        LiDAR adds 2 s per action. Other actions add no dwell time.
      </p>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-2">
          <div className="font-medium">Waypoints in flight order</div>
          <Badge
            count={`${preview.rows.length} waypoint${preview.rows.length === 1 ? "" : "s"}`}
            status="outline"
          />
        </div>
        <div
          className=" overflow-x-auto [border:0.0625rem_solid_var(--border)] rounded-(--radius)"
          data-testid="ms-preview-tablewrap"
        >
          <table
            className="w-full border-collapse text-[0.75rem]"
            aria-label="Waypoints in flight order"
          >
            <thead>
              <tr>
                <th
                  className="p-[0.375rem_0.625rem] text-left [border-bottom:0.0625rem_solid_var(--border)] whitespace-nowrap text-[0.6875rem] text-(--muted-foreground) bg-(--muted)"
                  scope="col"
                >
                  #
                </th>
                <th
                  className="p-[0.375rem_0.625rem] text-left [border-bottom:0.0625rem_solid_var(--border)] whitespace-nowrap text-[0.6875rem] text-(--muted-foreground) bg-(--muted)"
                  scope="col"
                >
                  X
                </th>
                <th
                  className="p-[0.375rem_0.625rem] text-left [border-bottom:0.0625rem_solid_var(--border)] whitespace-nowrap text-[0.6875rem] text-(--muted-foreground) bg-(--muted)"
                  scope="col"
                >
                  Y
                </th>
                <th
                  className="p-[0.375rem_0.625rem] text-left [border-bottom:0.0625rem_solid_var(--border)] whitespace-nowrap text-[0.6875rem] text-(--muted-foreground) bg-(--muted)"
                  scope="col"
                >
                  Z
                </th>
                <th
                  className="p-[0.375rem_0.625rem] text-left [border-bottom:0.0625rem_solid_var(--border)] whitespace-nowrap text-[0.6875rem] text-(--muted-foreground) bg-(--muted)"
                  scope="col"
                >
                  Action
                </th>
                <th
                  className="p-[0.375rem_0.625rem] text-left [border-bottom:0.0625rem_solid_var(--border)] whitespace-nowrap text-[0.6875rem] text-(--muted-foreground) bg-(--muted)"
                  scope="col"
                >
                  T+
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map(({ waypoint, time: arrivalTime }, index) => {
                const isActive = activeWaypointId === waypoint.id;
                const isLast = index === preview.rows.length - 1;
                const cellClassName = [
                  "p-[0.375rem_0.625rem] text-left [border-bottom:0.0625rem_solid_var(--border)] whitespace-nowrap",
                  isLast ? "[border-bottom:0]" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const selectRow = () => {
                  onSelectWaypoint(waypoint.id);
                  setPlaying(false);
                  setTime(arrivalTime);
                };
                return (
                  <tr
                    key={waypoint.id}
                    data-seq={waypoint.seq}
                    tabIndex={0}
                    aria-selected={isActive}
                    className={[
                      "cursor-pointer hover:bg-(--accent) focus-visible:[outline:0.125rem_solid_var(--primary)] focus-visible:-outline-offset-2",
                      isActive
                        ? "bg-[color-mix(in_srgb,var(--primary)_9%,var(--card))]"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-testid={`ms-preview-waypoint-${waypoint.seq}`}
                    onClick={selectRow}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectRow();
                      }
                    }}
                  >
                    <td className={cellClassName}>{waypoint.seq}</td>
                    <td className={cellClassName}>
                      {Math.round(waypoint.x * 10) / 10}
                    </td>
                    <td className={cellClassName}>
                      {Math.round(waypoint.y * 10) / 10}
                    </td>
                    <td className={cellClassName}>
                      {Math.round(waypoint.z * 10) / 10}
                    </td>
                    <td className={cellClassName}>
                      {waypoint.actions.length
                        ? waypoint.actions
                            .map((action) => action.label)
                            .join(" · ")
                        : "Fly to point"}
                    </td>
                    <td className={cellClassName}>{formatTime(arrivalTime)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
