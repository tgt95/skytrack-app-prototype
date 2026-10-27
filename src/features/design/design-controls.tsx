/* Leaf controls for mission design and map interaction. Keep state transitions in the route shell. */

import { SkyTooltip } from "../../ui/components/sky-tooltip";
import { useState } from "react";
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
