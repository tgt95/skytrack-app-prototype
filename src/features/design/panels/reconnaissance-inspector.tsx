import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  type ReconFlightSettings,
  type Waypoint,
  getMockReconGsdCmPerPx,
} from "../../../domain/mission-model";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import {
  distanceToDisplay,
  distanceUnit,
  formatMeasurementText,
  formatResolution,
  useMeasurementSystem,
} from "../../../shared/measurement-units";
import { ReconnaissanceSettingsForm } from "./reconnaissance-settings-form";

type ReconTarget = { kind: "route" | "area"; id: string };

export function ReconSettingsPage({
  codeView,
  target,
  value,
  onChange,
  onBack,
  onCancel,
  onSave,
}: {
  codeView: boolean;
  target: ReconTarget;
  value: ReconFlightSettings;
  onChange: (settings: ReconFlightSettings) => void;
  onBack: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className={`ms-inspector${codeView ? " ms-inspector-code" : ""}`}
      data-testid="ms-design-panel"
    >
      <section className="p-3" aria-label="Reconnaissance flight settings">
        <div className="flex items-center gap-1 mb-1">
          <SkyTooltip>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Back to design"
              onClick={onBack}
            >
              <ArrowLeftIcon aria-hidden="true" />
            </Button>
          </SkyTooltip>
          <span className="h6">
            {target.kind === "area"
              ? "Area reconnaissance settings"
              : "Route reconnaissance settings"}
          </span>
        </div>
        <p className="ms-hint">Configure capture settings for this mission.</p>
        <ReconnaissanceSettingsForm
          value={value}
          onChange={onChange}
          showFlightPattern={target.kind === "area"}
          altitudeReference={target.kind === "area" ? "AGL" : undefined}
        />
        <div className="ms-btnrow mt-8">
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" variant="default" onClick={onSave}>
            Save settings
          </Button>
        </div>
      </section>
    </div>
  );
}

export function ReconCaptureSummary({
  waypoints,
  settings,
  pathLength,
  altitudeAgl = false,
}: {
  waypoints: Waypoint[];
  settings: ReconFlightSettings;
  pathLength: number;
  altitudeAgl?: boolean;
}) {
  const unitSystem = useMeasurementSystem();
  const captureCount = waypoints.reduce(
    (sum, waypoint) =>
      sum + waypoint.actions.filter((action) => action.kind === "photo").length,
    0,
  );
  const minutes = Math.max(
    0,
    (pathLength / Math.max(0.5, settings.flightSpeedMS) + captureCount) / 60,
  );
  const batteryPct = Math.min(99, Math.round((minutes / 27) * 100));
  const gsd = getMockReconGsdCmPerPx(settings.altitudeM);
  const pitches = Array.from(
    new Set(
      waypoints.flatMap((waypoint) =>
        waypoint.actions
          .filter((action) => action.kind === "photo")
          .map((action) => action.gimbalPitchDeg ?? settings.gimbalPitchDeg),
      ),
    ),
  );
  const pitchSummary =
    pitches.length > 1
      ? "Mixed"
      : `${(pitches[0] ?? settings.gimbalPitchDeg).toFixed(0)}°`;
  const estimateNote = formatMeasurementText(
    `* Payload (17.3 mm sensor, 12.3 mm focal length, 5280 px) and fixed 27-minute battery. This segment estimate excludes Home launch, transfers, and return; Preview includes the full route at planned mission speed.${altitudeAgl ? " Area AGL uses flat z=0; terrain is omitted." : ""} Planning estimates only.`,
    unitSystem,
  );

  return (
    <div
      className="grid grid-cols-3 gap-y-3 gap-x-2 py-3 px-3.5 bg-[color-mix(in_srgb,var(--muted)_25%,transparent)] border-b border-b-border"
      aria-label="Capture summary"
      data-testid="ms-recon-summary"
    >
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-(--muted-foreground) text-xs">GSD estimate*</span>
        <strong className="overflow-hidden text-(--foreground) text-xs font-semibold text-ellipsis whitespace-nowrap">
          {formatResolution(gsd, unitSystem)}
        </strong>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-(--muted-foreground) text-xs">
          {altitudeAgl ? "Altitude AGL" : "Altitude"}
        </span>
        <strong className="overflow-hidden text-(--foreground) text-xs font-semibold text-ellipsis whitespace-nowrap">
          {distanceToDisplay(settings.altitudeM, unitSystem)}{" "}
          {distanceUnit(unitSystem)}
        </strong>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-(--muted-foreground) text-xs">
          Front / Side overlap
        </span>
        <strong className="overflow-hidden text-(--foreground) text-xs font-semibold text-ellipsis whitespace-nowrap">
          {settings.frontOverlapPct}% / {settings.sideOverlapPct}%
        </strong>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-(--muted-foreground) text-xs">Gimbal pitch</span>
        <strong className="overflow-hidden text-(--foreground) text-xs font-semibold text-ellipsis whitespace-nowrap">
          {pitchSummary}
        </strong>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-(--muted-foreground) text-xs">
          Segment estimate
        </span>
        <strong className="overflow-hidden text-(--foreground) text-xs font-semibold text-ellipsis whitespace-nowrap">
          {Math.ceil(minutes)} min
        </strong>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-(--muted-foreground) text-xs">
          Battery segment*
        </span>
        <strong className="overflow-hidden text-(--foreground) text-xs font-semibold text-ellipsis whitespace-nowrap">
          Spend {batteryPct}%
        </strong>
      </div>
      <small className="col-span-full text-(--muted-foreground) text-xs leading-[1.4]">
        {estimateNote}
      </small>
    </div>
  );
}
