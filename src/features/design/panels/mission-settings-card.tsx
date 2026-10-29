import {
  CaretDownIcon,
  CaretUpIcon,
  QuestionIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Alert, AlertDescription } from "skytrack-ui/alert";
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
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger,
} from "skytrack-ui/tooltip";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import {
  distanceFromDisplay,
  distanceToDisplay,
  distanceUnit,
  useMeasurementSystem,
} from "../../../shared/measurement-units";
import { InspectorField } from "../controls/inspector-field";
import {
  SAFETY_OPTIONS,
  safetyModeOf,
  type SafetyMode,
  type StudioMission,
  type ValidationIssue,
} from "../../../domain/mission-model";

export interface MissionSettingsCardProps {
  mission: StudioMission;
  open: boolean;
  tooltip: string;
  onOpenChange: (open: boolean) => void;
  onUpdateMission: (next: StudioMission, label?: string) => void;
  onAnnounce: (message: string) => void;
}

export function MissionChecksCard({
  issues,
  hidden = false,
}: {
  issues: ValidationIssue[];
  hidden?: boolean;
}) {
  if (hidden) return null;
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");
  return (
    <section className="ms-card" aria-label="Validation">
      <h3 className="heading ms-card-title">Checks</h3>
      {issues.length === 0 ? (
        <p className="ms-issue is-ok" role="status">
          Valid mission — Simulation is available.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5" data-testid="ms-issue-list">
          {errors.map((issue) => (
            <Alert key={issue.id} variant="default" role="alert">
              {/* <WarningCircleIcon className='size-5 shrink-0' aria-hidden='true' /> */}
              <AlertDescription>{issue.message}</AlertDescription>
            </Alert>
          ))}
          {warnings.map((issue) => (
            <Alert key={issue.id} variant="default" role="status">
              <AlertDescription>{issue.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MissionSettingsCard({
  mission,
  open,
  tooltip,
  onOpenChange,
  onUpdateMission,
  onAnnounce,
}: MissionSettingsCardProps) {
  const unitSystem = useMeasurementSystem();
  const takeoffChoices = Array.from(
    new Set([mission.takeoffAltM, 2, 5, 10, 12, 15, 20, 30]),
  ).sort((a, b) => a - b);
  const takeoffChoicesDisplay = takeoffChoices.map((value) =>
    distanceToDisplay(value, unitSystem),
  );
  return (
    <section
      // className="ms-card  in-[.ms-pane-head]:m-0 in-[.ms-pane-head]:[border:0] in-[.ms-pane-head]:rounded-none in-[.ms-pane-head]:bg-transparent"
      className="flex flex-col gap-3 p-3 border-b border-border"
      aria-label="Mission settings"
    >
      <div className="flex items-center gap-1" data-testid="ms-settings-head">
        <h3 className="h6 m-0">Mission settings</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="About mission settings"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => onAnnounce(tooltip)}
                />
              }
            >
              <QuestionIcon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipPositioner side="bottom" sideOffset={8}>
                <TooltipPopup>
                  <TooltipArrow />
                  {tooltip}
                </TooltipPopup>
              </TooltipPositioner>
            </TooltipPortal>
          </Tooltip>
        </TooltipProvider>
        <span className=" flex-[1_1_auto]" data-testid="ms-settings-spacer" />
        <SkyTooltip>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-expanded={open}
            aria-label={
              open ? "Collapse mission settings" : "Expand mission settings"
            }
            data-testid="ms-settings-toggle"
            onClick={() => onOpenChange(!open)}
          >
            {open ? (
              <CaretUpIcon aria-hidden="true" />
            ) : (
              <CaretDownIcon aria-hidden="true" />
            )}
          </Button>
        </SkyTooltip>
      </div>
      {open ? (
        <div className="flex flex-col gap-3">
          <InspectorField
            label={`Take-off altitude (${distanceUnit(unitSystem)})`}
            labelId="ms-takeoff-label"
          >
            <Select<string>
              items={takeoffChoicesDisplay.map((value) => ({
                value: String(value),
                label: value.toFixed(2),
              }))}
              value={String(distanceToDisplay(mission.takeoffAltM, unitSystem))}
              onValueChange={(value: unknown) => {
                const next = distanceFromDisplay(Number(value), unitSystem);
                if (
                  !Number.isFinite(next) ||
                  next < 0 ||
                  next === mission.takeoffAltM
                )
                  return;
                onUpdateMission(
                  { ...mission, takeoffAltM: Math.round(next * 100) / 100 },
                  `Take-off altitude set to ${next.toFixed(2)} ${distanceUnit(unitSystem)}.`,
                );
              }}
            >
              <SelectTrigger
                aria-labelledby="ms-takeoff-label"
                data-testid="ms-takeoff-select"
                className="w-100/2 max-w-50"
              >
                <SelectValue />
                <SelectIcon />
              </SelectTrigger>
              <SelectPortal>
                <SelectPositioner side="bottom" align="end" sideOffset={4}>
                  <SelectPopup>
                    <SelectList>
                      {takeoffChoicesDisplay.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          <SelectItemIndicator />
                          <SelectItemText>{value.toFixed(2)}</SelectItemText>
                        </SelectItem>
                      ))}
                    </SelectList>
                  </SelectPopup>
                </SelectPositioner>
              </SelectPortal>
            </Select>
          </InspectorField>
          <InspectorField label="Safety options" labelId="ms-safety-label">
            <Select<string>
              items={SAFETY_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={safetyModeOf(mission)}
              onValueChange={(value: unknown) => {
                const mode = String(value) as SafetyMode;
                if (
                  mode === safetyModeOf(mission) ||
                  (mode !== "obstacle" && mode !== "privacy" && mode !== "off")
                )
                  return;
                onUpdateMission(
                  { ...mission, safetyMode: mode },
                  "Safety options updated.",
                );
              }}
            >
              <SelectTrigger
                aria-labelledby="ms-safety-label"
                data-testid="ms-safety-select"
                className="w-100/2 max-w-50"
              >
                <SelectValue />
                <SelectIcon />
              </SelectTrigger>
              <SelectPortal>
                <SelectPositioner side="bottom" align="end" sideOffset={4}>
                  <SelectPopup>
                    <SelectList>
                      {SAFETY_OPTIONS.map((option) => (
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
          </InspectorField>
        </div>
      ) : null}
    </section>
  );
}
