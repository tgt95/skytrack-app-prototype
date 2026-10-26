import { useEffect, useMemo, useState } from "react";
import { Button } from "skytrack-ui/button";
import { Badge } from "skytrack-ui/badge";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "skytrack-ui/slider";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
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
import { getMissionHome, type StudioMission } from "../../domain/mission-model";
import {
  buildPreview,
  previewPhotoCaptureAt,
  previewPositionAt,
} from "./mission-preview-model";
export {
  previewPhotoCaptureAt,
  previewPositionAt,
} from "./mission-preview-model";

/* Playback speeds keep the existing time math (seconds per tick scale). */
const SPEED_OPTIONS = [
  { value: "0.5", label: "0.5×" },
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
  { value: "4", label: "4×" },
  { value: "16", label: "16×" },
];

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

  const activeEvent = [...preview.events]
    .reverse()
    .find((event) => event.time <= time);
  const scrub =
    preview.duration > 0 ? Math.round((time / preview.duration) * 1000) : 0;
  const activeWaypointId = activeEvent?.waypoint.id ?? null;
  const home = getMissionHome(mission);
  const boundsPoints = [
    home,
    ...mission.waypoints,
    ...mission.areas.flatMap((area) => area.points),
  ];
  const bounds = boundsPoints.length
    ? {
        minX: Math.min(...boundsPoints.map((point) => point.x)),
        maxX: Math.max(...boundsPoints.map((point) => point.x)),
        minY: Math.min(...boundsPoints.map((point) => point.y)),
        maxY: Math.max(...boundsPoints.map((point) => point.y)),
      }
    : { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanY = Math.max(1, bounds.maxY - bounds.minY);
  const project = (x: number, y: number) => ({
    x: 30 + ((x - bounds.minX) / spanX) * 580,
    y: 24 + ((bounds.maxY - y) / spanY) * 232,
  });
  const activePosition = dronePosition
    ? project(dronePosition.x, dronePosition.y)
    : null;
  const homePosition = project(home.x, home.y);

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

      <div
        className="relative min-h-[13.75rem] overflow-hidden [border:0.0625rem_solid_var(--border)] rounded-(--radius) bg-[color-mix(in_srgb,var(--muted)_28%,var(--background))]"
        role="img"
        aria-label="Mini map of areas and flight path"
      >
        <svg
          className="block w-full h-full min-h-[13.75rem]"
          viewBox="0 0 640 280"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {Array.from({ length: 9 }, (_, index) => (
            <line
              key={`v${index}`}
              x1={index * 80}
              y1="0"
              x2={index * 80}
              y2="280"
              className="ms-preview-grid-line"
            />
          ))}
          {Array.from({ length: 5 }, (_, index) => (
            <line
              key={`h${index}`}
              x1="0"
              y1={index * 70}
              x2="640"
              y2={index * 70}
              className="ms-preview-grid-line"
            />
          ))}
          {mission.areas.map((area) => (
            <polygon
              key={area.id}
              points={area.points
                .map((point) => {
                  const p = project(point.x, point.y);
                  return `${p.x},${p.y}`;
                })
                .join(" ")}
              className=" fill-[color-mix(in_srgb,var(--primary)_12%,transparent)] stroke-(--primary) stroke-2 [stroke-dasharray:6_4]"
              data-testid="ms-preview-area"
            />
          ))}
          {preview.rows.map(({ waypoint }, index) => {
            const point = project(waypoint.x, waypoint.y);
            const next = preview.rows[index + 1]?.waypoint;
            const nextPoint = next ? project(next.x, next.y) : null;
            return (
              <g key={waypoint.id}>
                {nextPoint ? (
                  <line
                    x1={point.x}
                    y1={point.y}
                    x2={nextPoint.x}
                    y2={nextPoint.y}
                    className=" stroke-(--primary) stroke-3 [stroke-linecap:round]"
                    data-testid="ms-preview-route-line"
                  />
                ) : null}
                {waypoint.actions.some((action) => action.kind === "photo") ? (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="11"
                    className=" fill-none stroke-[#21ba91] stroke-2"
                    data-testid="ms-preview-photo-ring"
                  />
                ) : null}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  className=" fill-(--primary) stroke-(--background) stroke-3"
                  data-testid="ms-preview-waypoint-dot"
                />
                <text
                  x={point.x + 9}
                  y={point.y - 8}
                  className=" fill-(--foreground) [font:700_0.6875rem/1_system-ui,sans-serif] [paint-order:stroke] stroke-(--background) stroke-[0.1875rem]"
                  data-testid="ms-preview-map-label"
                >
                  {waypoint.seq}
                </text>
              </g>
            );
          })}
          <g
            data-testid="ms-preview-home-marker"
            transform={`translate(${homePosition.x} ${homePosition.y})`}
          >
            <circle
              r="10"
              className="fill-(--card) stroke-(--primary) stroke-2"
            />
            <text
              x="12"
              y="4"
              className="fill-(--foreground) [font:700_0.625rem/1_system-ui,sans-serif] [paint-order:stroke] stroke-(--background) stroke-[0.1875rem]"
            >
              HOME
            </text>
          </g>
          {activePosition ? (
            <g
              data-testid="ms-preview-drone-marker"
              transform={`translate(${activePosition.x} ${activePosition.y})`}
            >
              <circle
                r="12"
                className="fill-[#ed6b3c] stroke-[#fff] stroke-2"
              />
              <path d="M0 -8 L5 5 L0 2 L-5 5 Z" className="fill-[#fff]" />
            </g>
          ) : null}
        </svg>
        <span
          className=" absolute left-[0.625rem] bottom-[0.5rem] p-[0.25rem_0.4375rem] rounded-[0.3125rem] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] text-(--muted-foreground) text-[0.625rem]"
          data-testid="ms-preview-map-caption"
        >
          Route overview · photo points highlighted
        </span>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={showPhotoScanDemo}
          size="sm"
          data-testid="ms-preview-photo-demo-toggle"
          aria-label="Show photo scan demonstration"
          onCheckedChange={(checked: boolean) => setShowPhotoScanDemo(checked)}
        >
          <SwitchThumb />
        </Switch>
        Show photo scan demonstration
      </label>

      <div
        className=" flex items-center gap-[1rem] flex-wrap"
        role="region"
        aria-label="Route playback"
      >
        <Button
          type="button"
          variant="outline"
          aria-pressed={playing}
          onClick={() => {
            if (time >= preview.duration) setTime(0);
            setPlaying((current) => !current);
          }}
          disabled={preview.duration <= 0}
          aria-label={playing ? "Pause flight preview" : "Play flight preview"}
          data-testid="ms-preview-play"
        >
          {playing ? "Pause" : "Play"}
        </Button>
        <div
          className=" flex-[1_1_auto] min-w-0"
          data-testid="ms-preview-scrub"
        >
          <Slider
            value={scrub}
            min={0}
            max={1000}
            step={1}
            onValueChange={(next: number | readonly number[]) => {
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
            }}
          >
            <SliderControl>
              <SliderTrack>
                <SliderIndicator />
                <SliderThumb aria-label="Preview playback position" />
              </SliderTrack>
            </SliderControl>
          </Slider>
        </div>
        <div
          className=" flex-[0_0_auto] min-h-[2.125rem] [border:0.0625rem_solid_var(--border)] rounded-[0.375rem] bg-(--background) text-(--foreground)"
          data-testid="ms-preview-speed"
        >
          <Select<string>
            items={SPEED_OPTIONS}
            value={String(speed)}
            onValueChange={(next: unknown) => {
              const parsed = Number(next);
              if (
                SPEED_OPTIONS.some((option) => option.value === String(next)) &&
                Number.isFinite(parsed)
              )
                setSpeed(parsed);
            }}
          >
            <SelectTrigger
              aria-label="Preview playback speed"
              className=" min-w-[4.75rem]"
            >
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner side="bottom" align="end" sideOffset={4}>
                <SelectPopup>
                  <SelectList>
                    {SPEED_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <SelectItemIndicator />
                        <SelectItemText>{option.label}</SelectItemText>
                      </SelectItem>
                    ))}
                  </SelectList>
                </SelectPopup>
              </SelectPositioner>
            </SelectPortal>
          </Select>
        </div>
        <span
          className="ms-preview-time flex-[0_0_auto] text-[0.75rem] text-(--muted-foreground) [font-variant-numeric:tabular-nums] whitespace-nowrap"
          data-testid="ms-preview-time"
        >
          {formatTime(time)} / {formatTime(preview.duration)}
        </span>
      </div>

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
