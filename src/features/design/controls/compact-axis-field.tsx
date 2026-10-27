/* Compact numeric text draft for sequence metadata (target speed).
   Keeps the stateful external-value sync used by the previous
   `sequence-controls.tsx` implementation. */

import { useState } from "react";
import { NumberField, NumberFieldInput } from "skytrack-ui/number-field";

export function CompactAxisField({
  label,
  short,
  value,
  min,
  max,
  step,
  inputSize = "compact",
  inputWidth = "flex",
  className,
  axisClassName,
  onChange,
}: {
  label: string;
  short: string;
  value: number;
  min: number;
  max: number;
  step: number;
  inputSize?: "compact" | "xs";
  inputWidth?: "flex" | "fixed";
  className?: string;
  axisClassName?: string;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  // Render-phase sync: an external value change (undo, reorder, reset) drops
  // any in-progress text so the field never shows a stale edit.
  const [syncedValue, setSyncedValue] = useState(value);
  if (syncedValue !== value) {
    setSyncedValue(value);
    setText(null);
  }
  const display = text ?? String(value);
  const commit = (v: number) => {
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
  };
  return (
    <label className={["ms-axis-compact", className].filter(Boolean).join(" ")}>
      <span
        className={["ms-axis flex-[0_0_auto]", axisClassName]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        {short}
      </span>
      <NumberField
        value={value}
        min={min}
        max={max}
        step={step}
        className={`min-w-0 gap-0 ${inputWidth === "fixed" ? "w-16 shrink-0 flex-none" : "basis-16 flex-[1_1_auto]"}`}
        onValueChange={(next) => {
          if (typeof next === "number" && Number.isFinite(next)) {
            setText(String(next));
            commit(next);
          }
        }}
        data-testid="ms-axis-number-field"
      >
        <NumberFieldInput
          className="w-full min-w-0"
          size={inputSize}
          aria-label={label}
          value={display}
          onChange={(event) => {
            setText(event.target.value);
            commit(Number.parseFloat(event.currentTarget.value));
          }}
          onBlur={(event) => {
            setText(null);
            const v = Number.parseFloat(event.currentTarget.value);
            if (Number.isFinite(v)) {
              const clamped = Math.min(max, Math.max(min, v));
              if (clamped !== value) onChange(clamped);
            }
          }}
        />
      </NumberField>
    </label>
  );
}
