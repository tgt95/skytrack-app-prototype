import {
  ArrowLeftIcon,
  CaretRightIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "skytrack-ui/collapsible";
import {
  type ReconFlightSettings,
  type Waypoint,
  getMockReconGsdCmPerPx,
} from "@/domain/mission-model";
import { SkyTooltip } from "@/ui/components/sky-tooltip";
import {
  distanceToDisplay,
  distanceUnit,
  formatMeasurementText,
  formatResolution,
  useMeasurementSystem,
} from "@/shared/measurement-units";
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
    <section
      className={`ms-inspector box-border flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden${codeView ? " ms-inspector-code" : ""}`}
      aria-label="Reconnaissance flight settings"
      data-testid="ms-design-panel"
    >
      <header className="sticky top-0 z-2 w-full min-w-0 border-b border-border bg-(--card) p-4">
        <div className="flex min-w-0 items-center gap-2">
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
          <h2 className="m-0 min-w-0 text-lg font-semibold">
            {target.kind === "area"
              ? "Area reconnaissance settings"
              : "Route reconnaissance settings"}
          </h2>
        </div>
      </header>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4">
        <p className="ms-hint m-0 text-sm text-(--muted-foreground) leading-[1.5]">
          Configure capture settings for this mission.
        </p>
        <ReconnaissanceSettingsForm
          value={value}
          onChange={onChange}
          showFlightPattern={target.kind === "area"}
          altitudeReference={target.kind === "area" ? "AGL" : undefined}
        />
      </div>
      <footer className="sticky bottom-0 flex w-full min-w-0 justify-end gap-2 border-t border-border bg-card p-3">
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="default" onClick={onSave}>
          Save settings
        </Button>
      </footer>
    </section>
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
      className="grid grid-cols-2 gap-y-3 gap-x-2 py-3 px-3.5 bg-[color-mix(in_srgb,var(--muted)_25%,transparent)] border-b border-b-border"
      aria-label="Capture summary"
      data-testid="ms-recon-summary"
    >
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm text-muted-foreground">GSD estimate*</span>
        <div className="overflow-hidden text-foreground text-base tabular-nums font-medium text-ellipsis whitespace-nowrap">
          {formatResolution(gsd, unitSystem)}
        </div>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm text-muted-foreground">
          {altitudeAgl ? "Altitude AGL" : "Altitude"}
        </span>
        <div className="overflow-hidden text-foreground text-base tabular-nums font-medium text-ellipsis whitespace-nowrap">
          {distanceToDisplay(settings.altitudeM, unitSystem)}{" "}
          {distanceUnit(unitSystem)}
        </div>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm text-muted-foreground">
          Front / Side overlap
        </span>
        <div className="overflow-hidden text-foreground text-base tabular-nums font-medium text-ellipsis whitespace-nowrap">
          {settings.frontOverlapPct}% / {settings.sideOverlapPct}%
        </div>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm text-muted-foreground">Gimbal pitch</span>
        <div className="overflow-hidden text-foreground text-base tabular-nums font-medium text-ellipsis whitespace-nowrap">
          {pitchSummary}
        </div>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm text-muted-foreground">
          Segment estimate
        </span>
        <div className="overflow-hidden text-foreground text-base tabular-nums font-medium text-ellipsis whitespace-nowrap">
          {Math.ceil(minutes)} min
        </div>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm text-muted-foreground">
          Battery segment*
        </span>
        <div className="overflow-hidden text-foreground text-base tabular-nums font-medium text-ellipsis whitespace-nowrap">
          Spend {batteryPct}%
        </div>
      </div>
      <Collapsible className="col-span-full w-full min-w-0 text-sm text-muted-foreground">
        <CollapsibleTrigger className="group flex w-fit cursor-pointer items-center gap-1.5 select-none">
          <InfoIcon aria-hidden="true" className="size-3.5" />
          <span>About these estimates</span>
          <CaretRightIcon
            aria-hidden="true"
            className="size-3 transition-transform group-data-panel-open:rotate-90"
          />
        </CollapsibleTrigger>
        <CollapsiblePanel className="pt-1">
          <p className="m-0 leading-[1.4]">{estimateNote}</p>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  );
}
