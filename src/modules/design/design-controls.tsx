/* Leaf controls for mission design and map interaction. Keep state transitions in the route shell. */

import { SkyTooltip } from "../../shared/sky-tooltip";
import { type CSSProperties, useRef, useState } from "react";
import { CheckIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Toggle } from "skytrack-ui/toggle";
import { ToolbarButton } from "skytrack-ui/toolbar";
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger,
} from "skytrack-ui/tooltip";
import { BASEMAPS, type MissionBasemapStyle } from "../scene/basemaps";

/* Toolbar-backed button with styled tooltip and native disabled semantics. */
export function ToolButton({
  label,
  hint,
  active,
  disabled,
  onClick,
  children,
  testid,
}: {
  label: string;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testid?: string;
}) {
  const fullLabel = hint ? `${label} — ${hint}` : label;
  if (disabled) {
    return (
      <SkyTooltip>
        <ToolbarButton
          type="button"
          render={<Toggle variant="brand" pressed={active} />}
          size="icon"
          aria-label={fullLabel}
          data-testid={testid}
          onClick={onClick}
          disabled
        >
          {children}
        </ToolbarButton>
      </SkyTooltip>
    );
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <ToolbarButton
              type="button"
              render={<Toggle variant="brand" pressed={active} />}
              size="icon"
              aria-label={fullLabel}
              data-testid={testid}
              onClick={onClick}
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="right" sideOffset={8}>
            <TooltipPopup>
              <TooltipArrow />
              {label}
              {hint ? ` — ${hint}` : ""}
            </TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
}

/* Planner-style basemap preview grid shared by the 2D and 3D map pickers.
   Satellite stays the Studio default; switching only swaps the active map
   imagery and never touches camera, entities, or mission state. */
export function BasemapPickerGrid({
  value,
  onChange,
  testidPrefix,
}: {
  value: MissionBasemapStyle;
  onChange: (style: MissionBasemapStyle) => void;
  testidPrefix: string;
}) {
  const groups: { label: string; ids: MissionBasemapStyle[] }[] = [
    { label: "Standard", ids: ["satellite", "basic", "light", "dark"] },
    { label: "More styles", ids: ["daybreak", "overcast"] },
  ];
  return (
    <>
      {groups.map((group) => (
        <div key={group.label}>
          <p
            className=" m-[0.75rem_0_0.375rem] text-(--muted-foreground) text-[0.6875rem] font-semibold tracking-[0.06em] uppercase"
            data-testid="ms-basemap-group-label"
          >
            {group.label}
          </p>
          <div
            className=" grid grid-cols-2 gap-[0.5rem]"
            data-testid="ms-basemap-grid"
          >
            {group.ids.map((id) => {
              const option = BASEMAPS[id];
              return (
                <Button
                  key={id}
                  type="button"
                  variant={value === id ? "secondary" : "outline"}
                  aria-pressed={value === id}
                  data-testid={`${testidPrefix}-${id}`}
                  className=" flex min-w-0 h-[5.625rem] flex-col items-stretch justify-start gap-[0.25rem] p-[0.3125rem] overflow-hidden text-[0.75rem]"
                  onClick={() => onChange(id)}
                >
                  <span
                    className=" relative block w-full h-[3.25rem] overflow-hidden [border:0.0625rem_solid_var(--border)] rounded-[calc(var(--radius)-0.0625rem)] bg-(--muted) [&_img]:block [&_img]:w-full [&_img]:h-full [&_img]:object-cover"
                    data-testid="ms-basemap-thumb"
                  >
                    <img
                      src={option.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.visibility = "hidden";
                      }}
                    />
                    {value === id ? (
                      <span
                        className=" absolute top-[0.25rem] right-[0.25rem] flex w-[1.25rem] h-[1.25rem] items-center justify-center rounded-[62.4375rem] bg-(--primary) text-(--primary-foreground)"
                        data-testid="ms-basemap-check"
                      >
                        <CheckIcon aria-hidden="true" weight="bold" />
                      </span>
                    ) : null}
                  </span>
                  <span>{option.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

const RULER_MIN = 0;
const RULER_MAX = 500;
const RULER_STEP = 0.5;

export function clampSnapRuler(v: number): number {
  if (!Number.isFinite(v)) return 2.0;
  return Math.min(RULER_MAX, Math.max(RULER_MIN, Math.round(v * 2) / 2));
}

/* Right-edge drawing-altitude ruler (reference 03): tick track with a
   draggable knob plus a value badge aligned with the knob holding direct
   numeric input. Draft-only: commits change future geometry altitude, never
   the selected waypoint. 0–500 m, 0.5 m step, default 2.0 m. */
export function DrawingAltitudeRuler({
  value,
  onCommit,
  onAnnounce,
}: {
  value: number;
  onCommit: (v: number) => void;
  onAnnounce: (text: string) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const shown = text ?? value.toFixed(1);
  const pct = Math.min(
    100,
    Math.max(0, ((value - RULER_MIN) / (RULER_MAX - RULER_MIN)) * 100),
  );
  const badgeBottom = `clamp(12px, ${pct}%, calc(100% - 12px))`;

  const valueFromClientY = (clientY: number): number | null => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    if (rect.height <= 0) return null;
    const t = 1 - (clientY - rect.top) / rect.height;
    return clampSnapRuler(t * (RULER_MAX - RULER_MIN) + RULER_MIN);
  };

  const commitText = (raw: string | null) => {
    if (raw === null) return;
    // Empty or invalid input reverts to the last committed value.
    if (raw.trim() === "") {
      setText(null);
      return;
    }
    const parsed = Number(raw.trim());
    if (!Number.isFinite(parsed)) {
      setText(null);
      return;
    }
    onCommit(clampSnapRuler(parsed));
    setText(null);
  };

  const stepCommit = (delta: number) => {
    const anchor = text !== null && text.trim() !== "" ? Number(text) : value;
    const next = clampSnapRuler(
      (Number.isFinite(anchor) ? anchor : value) + delta,
    );
    onCommit(next);
    return next;
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      trackRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const v = valueFromClientY(e.clientY);
    if (v !== null) onCommit(v);
  };

  const onTrackPointerMove = (e: React.PointerEvent) => {
    if ((e.buttons & 1) === 0) return;
    const v = valueFromClientY(e.clientY);
    if (v !== null) onCommit(v);
  };

  const onKnobKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === "ArrowUp" || e.key === "ArrowRight")
      next = clampSnapRuler(value + RULER_STEP);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft")
      next = clampSnapRuler(value - RULER_STEP);
    else if (e.key === "Home") next = RULER_MIN;
    else if (e.key === "End") next = RULER_MAX;
    else if (e.key === "PageUp") next = clampSnapRuler(value + 5);
    else if (e.key === "PageDown") next = clampSnapRuler(value - 5);
    if (next === null) return;
    e.preventDefault();
    onCommit(next);
    onAnnounce(
      `Drawing altitude ${next.toFixed(1)} meters. Future geometry only.`,
    );
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitText(text);
    } else if (e.key === "Escape") {
      // Cancel the edit; revert without committing. The window shortcut
      // handler already ignores Escape while typing.
      e.preventDefault();
      e.stopPropagation();
      setText(null);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = stepCommit(RULER_STEP);
      setText(next.toFixed(1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = stepCommit(-RULER_STEP);
      setText(next.toFixed(1));
    }
  };

  return (
    <div
      className=" [@media_(max-width:_61.25rem)]:right-0 absolute right-0 top-0 bottom-0 z-6 pointer-events-none flex flex-col items-stretch min-h-0"
      role="group"
      aria-label="Drawing altitude in meters, 0 to 500 in half-meter steps"
    >
      <div
        className=" relative flex-[1_1_auto] flex flex-row items-stretch gap-[0.375rem] min-h-0"
        data-testid="ms-alt-body"
      >
        <div
          className=" [@media_(max-width:_61.25rem)]:basis-[4.125rem] relative flex-[0_0_4.875rem] min-h-0 pointer-events-none"
          data-testid="ms-alt-badge-slot"
        >
          <div
            className={
              ' absolute bottom-(--ms-alt-badge-bottom) left-0 right-[0.125rem] pointer-events-auto transform-[translateY(50%)] flex items-baseline gap-[0.1875rem] p-[0.1875rem_0.375rem] bg-(--background) [border:0.0625rem_solid_var(--border)] rounded-[calc(var(--radius)-0.125rem)] [&::after]:[content:""] [&::after]:absolute [&::after]:right-[-0.3125rem] [&::after]:top-[50%] [&::after]:transform-[translateY(-50%)] [&::after]:[border-top:0.3125rem_solid_transparent] [&::after]:[border-bottom:0.3125rem_solid_transparent] [&::after]:[border-left:0.3125rem_solid_var(--border)] focus-within:[outline:0.125rem_solid_var(--primary)] focus-within:outline-offset-1'
            }
            style={{ "--ms-alt-badge-bottom": badgeBottom } as CSSProperties}
            data-testid="ms-alt-badge"
          >
            <input
              className=" flex-[1_1_auto] min-w-0 bg-transparent [border:0] p-0 text-(--foreground) text-[0.75rem] font-bold text-right [font-variant-numeric:tabular-nums] focus:[outline:none]"
              data-testid="ms-alt-ruler-input"
              value={shown}
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              aria-label="Drawing altitude in meters"
              onFocus={(e) => {
                setText(value.toFixed(1));
                e.target.select();
              }}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => commitText(text)}
              onKeyDown={onInputKeyDown}
            />
            <span
              className=" flex-[0_0_auto] text-[0.6875rem] font-semibold text-(--muted-foreground)"
              aria-hidden="true"
              data-testid="ms-alt-unit"
            >
              m
            </span>
          </div>
        </div>
        <div
          ref={trackRef}
          className=" relative flex-[0_0_1.5rem] min-h-[4rem] pointer-events-auto cursor-ns-resize touch-none bg-(--card) [border-left:0.0625rem_solid_var(--border)]"
          data-testid="ms-alt-ruler-track"
          style={
            {
              "--ms-alt-percent": `${pct}%`,
              "--ms-alt-gradient-height": `min(40px, ${pct}%)`,
            } as CSSProperties
          }
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
        >
          <div
            className=" absolute bottom-(--ms-alt-percent) left-0 right-0 h-(--ms-alt-gradient-height,7.5rem) transform-[translateY(100%)] bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--primary)_24%,transparent),transparent)] pointer-events-none"
            aria-hidden="true"
            data-testid="ms-alt-gradient"
          />
          <div
            className={
              ' absolute inset-0 pointer-events-none [&::before]:absolute [&::before]:inset-0 [&::before]:[content:""] [&::before]:bg-bottom-right [&::before]:bg-repeat-y [&::after]:absolute [&::after]:inset-0 [&::after]:[content:""] [&::after]:bg-bottom-right [&::after]:bg-repeat-y [&::before]:bg-[repeating-linear-gradient(to_top,transparent_0,transparent_calc(1%-0.03125rem),color-mix(in_srgb,var(--border)_75%,transparent)_calc(1%-0.03125rem),color-mix(in_srgb,var(--border)_75%,transparent)_1%)] [&::before]:mask-[linear-gradient(to_left,#000_0_1.125rem,transparent_1.125rem)] [&::after]:bg-[repeating-linear-gradient(to_top,transparent_0,transparent_calc(0.2%-0.00625rem),color-mix(in_srgb,var(--border)_40%,transparent)_calc(0.2%-0.00625rem),color-mix(in_srgb,var(--border)_40%,transparent)_0.2%)] [&::after]:mask-[linear-gradient(to_left,#000_0_0.5625rem,transparent_0.5625rem)]'
            }
            aria-hidden="true"
            data-testid="ms-alt-ticks"
          />
          <div
            className=" absolute bottom-(--ms-alt-percent) left-0 right-0 h-[0.125rem] transform-[translateY(50%)] bg-(--primary) z-2 pointer-events-none"
            aria-hidden="true"
            data-testid="ms-alt-active-line"
          />
          <div
            className=" absolute bottom-(--ms-alt-percent) left-[50%] w-[1.125rem] h-[1.125rem] transform-[translate(-50%,50%)] rounded-[50%] bg-(--background) [border:0.125rem_solid_var(--primary)] cursor-grab z-2 active:cursor-grabbing focus-visible:[outline:0.125rem_solid_var(--primary)] focus-visible:outline-offset-2"
            data-testid="ms-alt-ruler-knob"
            role="slider"
            tabIndex={0}
            aria-label="Drawing altitude in meters, 0 to 500 in half-meter steps"
            aria-valuemin={RULER_MIN}
            aria-valuemax={RULER_MAX}
            aria-valuenow={value}
            aria-valuetext={`${value.toFixed(1)} meters`}
            aria-orientation="vertical"
            onKeyDown={onKnobKeyDown}
          />
        </div>
      </div>
      <span className=" hidden" aria-hidden="true" data-testid="ms-alt-hint">
        ALT
      </span>
    </div>
  );
}

export function DraftAxisInput({
  label,
  axis,
  value,
  min,
  max,
  precision,
  onChange,
}: {
  label: string;
  axis: "X" | "Y" | "Z";
  value: number;
  min: number;
  max: number;
  precision: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [syncedValue, setSyncedValue] = useState(value);
  if (syncedValue !== value) {
    setSyncedValue(value);
    setText(null);
  }

  const display = text ?? value.toFixed(2);

  const normalize = (val: number): number => {
    const clamped = Math.min(max, Math.max(min, val));
    if (precision === 0.1) {
      return Math.round(clamped * 10) / 10;
    }
    return Math.round(clamped * 100) / 100;
  };

  const commit = (rawText: string | null) => {
    setText(null);
    if (rawText === null || rawText.trim() === "") {
      return;
    }
    const num = Number(rawText);
    if (!Number.isFinite(num)) {
      return;
    }
    const nextVal = normalize(num);
    onChange(nextVal);
  };

  return (
    <label className="ms-axis-compact min-w-0 whitespace-nowrap">
      <span
        className="ms-axis flex-[0_0_auto] min-w-0 whitespace-nowrap"
        aria-hidden="true"
      >
        {axis}
      </span>
      <input
        type="number"
        inputMode="decimal"
        className=" flex-[1_1_auto] w-full min-w-0 h-[1.5rem] box-border p-[0.0625rem_0.1875rem] [font:inherit] text-[0.6875rem] [font-variant-numeric:tabular-nums] text-(--foreground) bg-(--background) [border:0.0625rem_solid_var(--border)] rounded-(--radius) focus-visible:[outline:0.125rem_solid_var(--primary)] focus-visible:outline-offset-1"
        aria-label={label}
        value={display}
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        step={precision}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          if (raw.trim() !== "") {
            const num = Number(raw);
            if (Number.isFinite(num) && num >= min && num <= max) {
              const normalized = normalize(num);
              onChange(normalized);
            }
          }
        }}
        onBlur={(event) => {
          commit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            commit(event.currentTarget.value);
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setText(null);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
