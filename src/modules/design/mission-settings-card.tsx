import {
  CaretDownIcon,
  CaretUpIcon,
  QuestionIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
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
import { SkyTooltip } from "../../shared/sky-tooltip";
import {
  SAFETY_OPTIONS,
  safetyModeOf,
  type SafetyMode,
  type StudioMission,
  type ValidationIssue,
} from "../../domain/mission-model";

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
        <ul
          className=" [list-style:none] m-0 p-0 flex flex-col gap-[0.375rem]"
          data-testid="ms-issue-list"
        >
          {errors.map((issue) => (
            <li key={issue.id} className="ms-issue is-error" role="alert">
              {issue.message}
            </li>
          ))}
          {warnings.map((issue) => (
            <li key={issue.id} className="ms-issue is-warning" role="status">
              {issue.message}
            </li>
          ))}
        </ul>
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
  const takeoffChoices = Array.from(
    new Set([mission.takeoffAltM, 2, 5, 10, 12, 15, 20, 30]),
  ).sort((a, b) => a - b);
  return (
    <section
      className="ms-card  in-[.ms-pane-head]:m-0 in-[.ms-pane-head]:[border:0] in-[.ms-pane-head]:rounded-none in-[.ms-pane-head]:bg-transparent"
      aria-label="Mission settings"
    >
      <div
        className=" flex items-center gap-[0.25rem]"
        data-testid="ms-settings-head"
      >
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
        <>
          <div className="ms-data-row">
            <span id="ms-takeoff-label">Take-off altitude</span>
            <Select<string>
              items={takeoffChoices.map((value) => ({
                value: String(value),
                label: value.toFixed(2),
              }))}
              value={String(mission.takeoffAltM)}
              onValueChange={(value: unknown) => {
                const next = Number(value);
                if (
                  !Number.isFinite(next) ||
                  next < 0 ||
                  next === mission.takeoffAltM
                )
                  return;
                onUpdateMission(
                  { ...mission, takeoffAltM: Math.round(next * 100) / 100 },
                  `Take-off altitude set to ${next.toFixed(2)} m.`,
                );
              }}
            >
              <SelectTrigger
                aria-labelledby="ms-takeoff-label"
                data-testid="ms-takeoff-select"
                className="ms-data-select"
              >
                <SelectValue />
                <SelectIcon />
              </SelectTrigger>
              <SelectPortal>
                <SelectPositioner side="bottom" align="end" sideOffset={4}>
                  <SelectPopup>
                    <SelectList>
                      {takeoffChoices.map((value) => (
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
          </div>
          <div className="ms-data-row">
            <span id="ms-safety-label">Safety options</span>
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
                className="ms-data-select"
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
          </div>
        </>
      ) : null}
    </section>
  );
}
