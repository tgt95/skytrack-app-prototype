/* simulation-panel.tsx — right inspector for the Simulation stage:
   Details / Events / (Console in Code mode) tabs, settings, run footer. */

import { useEffect, useState } from "react";
import {
  ArrowCounterClockwiseIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
} from "@phosphor-icons/react";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "skytrack-ui/accordion";
import { Button } from "skytrack-ui/button";
import { FieldLabel, FieldRoot } from "skytrack-ui/field";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "skytrack-ui/number-field";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "skytrack-ui/progress";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "skytrack-ui/slider";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "skytrack-ui/tabs";
import type { StudioMission } from "../../domain/mission-model";
import {
  type SimEventItem,
  type SimLogLine,
  type SimPlan,
  type SimSettings,
  type SimStatus,
  type Telemetry,
} from "./simulation";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ms-stat">
      <dt className="text-[0.6875rem] text-(--muted-foreground)">{label}</dt>
      <dd className="m-0 text-[0.75rem] font-semibold overflow-hidden text-ellipsis">
        {value}
      </dd>
    </div>
  );
}

export interface SimulationPanelProps {
  mission: StudioMission;
  plan: SimPlan | null;
  gateReason: string | null;
  telemetry: Telemetry | null;
  status: SimStatus;
  simT: number;
  totalT: number;
  runIndex: number;
  log: SimLogLine[];
  fired: SimEventItem[];
  settings: SimSettings;
  showConsole: boolean;
  tab: string;
  onTabChange: (tab: string) => void;
  onRun: () => void;
  onPause: () => void;
  onResume: () => void;
  onAbort: () => void;
  onRestart: () => void;
  onSelectEvent: (ev: SimEventItem) => void;
}

export interface SimulationSettingsFormProps {
  settings: SimSettings;
  onChange: (settings: SimSettings) => void;
  onClose?: () => void;
  /** Waypoint count used to bound the mock-failure field. Defaults when rendered without mission context. */
  maxSeq?: number;
}

/** Countdown (seconds) before the panel auto-restarts a completed/failed run. */
export const AUTO_RESTART_DELAY_S = 5;

export function SimulationSettingsForm({
  settings,
  onChange,
  onClose,
  maxSeq = 99,
}: SimulationSettingsFormProps) {
  return (
    <div>
      <FieldRoot className="ms-field">
        <FieldLabel>Run times</FieldLabel>
        <NumberField
          value={settings.runTimes}
          min={1}
          max={20}
          step={1}
          onValueChange={(v: number | null) => {
            if (v !== null)
              onChange({
                ...settings,
                runTimes: Math.min(20, Math.max(1, Math.round(v))),
              });
          }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement aria-label="Decrease run times">
              −
            </NumberFieldDecrement>
            <NumberFieldInput aria-label="Run times" />
            <NumberFieldIncrement aria-label="Increase run times">
              +
            </NumberFieldIncrement>
          </NumberFieldGroup>
        </NumberField>
        <p className="ms-hint">Enter 1–20.</p>
      </FieldRoot>
      <FieldRoot className="ms-field">
        <FieldLabel>
          Playback speed — {settings.speedFactor.toFixed(1)}×
        </FieldLabel>
        <Slider
          value={settings.speedFactor}
          min={0.25}
          max={4}
          step={0.25}
          onValueChange={(v: number | readonly number[]) => {
            const first = typeof v === "number" ? v : v[0];
            if (typeof first === "number")
              onChange({ ...settings, speedFactor: first });
          }}
        >
          <SliderControl>
            <SliderTrack>
              <SliderIndicator />
              <SliderThumb aria-label="Playback speed" />
            </SliderTrack>
          </SliderControl>
        </Slider>
      </FieldRoot>
      <label
        className=" flex items-center gap-[0.5rem] text-[0.8125rem] cursor-pointer"
        data-testid="ms-switchrow"
      >
        <Switch
          checked={settings.reducedMotion}
          size="sm"
          onCheckedChange={(v: boolean) =>
            onChange({ ...settings, reducedMotion: v })
          }
          aria-label="Reduced motion"
        >
          <SwitchThumb />
        </Switch>
        Reduced motion (step vehicle, no camera glide)
      </label>
      <FieldRoot className="ms-field">
        <FieldLabel>Wind (m/s)</FieldLabel>
        <NumberField
          value={settings.windMS}
          min={0}
          max={12}
          step={0.5}
          onValueChange={(v: number | null) => {
            if (v !== null) onChange({ ...settings, windMS: v });
          }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement aria-label="Decrease wind">
              −
            </NumberFieldDecrement>
            <NumberFieldInput aria-label="Wind" />
            <NumberFieldIncrement aria-label="Increase wind">
              +
            </NumberFieldIncrement>
          </NumberFieldGroup>
        </NumberField>
      </FieldRoot>
      <FieldRoot className="ms-field">
        <FieldLabel>Inject failure at waypoint (0 = none)</FieldLabel>
        <NumberField
          value={settings.mockFailureAtSeq}
          min={0}
          max={maxSeq}
          step={1}
          onValueChange={(v: number | null) => {
            if (v !== null)
              onChange({
                ...settings,
                mockFailureAtSeq: Math.min(maxSeq, Math.max(0, Math.round(v))),
              });
          }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement aria-label="Decrease failure waypoint">
              −
            </NumberFieldDecrement>
            <NumberFieldInput aria-label="Failure waypoint" />
            <NumberFieldIncrement aria-label="Increase failure waypoint">
              +
            </NumberFieldIncrement>
          </NumberFieldGroup>
        </NumberField>
      </FieldRoot>
      {onClose ? (
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      ) : null}
    </div>
  );
}

export default function SimulationPanel(props: SimulationPanelProps) {
  const {
    mission,
    plan,
    gateReason,
    telemetry,
    status,
    simT,
    totalT,
    runIndex,
    log,
    fired,
    settings,
    showConsole,
    tab,
    onTabChange,
    onRun,
    onPause,
    onResume,
    onAbort,
    onRestart,
    onSelectEvent,
  } = props;
  const [autoRestartIn, setAutoRestartIn] = useState<number | null>(null);
  const activeTab = showConsole ? tab : tab === "console" ? "details" : tab;

  // Source parity: completed/failed runs auto-restart after a short
  // countdown unless the operator cancels. The countdown text lives inside
  // the existing role=status/alert messages so assistive tech announces it.
  useEffect(() => {
    if (status === "completed" || status === "failed") {
      setAutoRestartIn(AUTO_RESTART_DELAY_S);
    } else {
      setAutoRestartIn(null);
    }
  }, [status]);

  useEffect(() => {
    if (autoRestartIn === null) return;
    if (autoRestartIn <= 0) {
      onRestart();
      return;
    }
    const id = window.setTimeout(() => {
      setAutoRestartIn((n) => (n === null ? n : n - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [autoRestartIn, onRestart]);

  const running = status === "running";
  const paused = status === "paused";
  const ended =
    status === "completed" || status === "aborted" || status === "failed";
  const pct = totalT > 0 ? Math.min(100, (simT / totalT) * 100) : 0;
  const currentSeq = telemetry?.targetSeq ?? null;

  return (
    <div className="ms-inspector" data-testid="ms-sim-panel">
      {!plan ? (
        <section className="ms-card" role="status">
          <h3 className="ms-card-title">Simulation locked</h3>
          <p className="ms-hint">{gateReason ?? "Add mission logic first."}</p>
        </section>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v: unknown) => onTabChange(String(v))}
        >
          <TabsList aria-label="Simulation views">
            <TabsTab value="details">Mission details</TabsTab>
            <TabsTab value="events">Events</TabsTab>
            {showConsole ? <TabsTab value="console">Console</TabsTab> : null}
            <TabsIndicator />
          </TabsList>

          <TabsPanel value="details">
            <Accordion
              aria-label="Drone and route details"
              multiple
              defaultValue={["drone", "route"]}
            >
              <AccordionItem value="drone">
                <AccordionHeader>
                  <AccordionTrigger>
                    Drone telemetry{telemetry ? ` — ${telemetry.mode}` : ""}
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionPanel>
                  {telemetry ? (
                    <dl
                      className=" m-0 grid grid-cols-[1fr_1fr] gap-[0.375rem_0.625rem]"
                      data-testid="ms-telemetry"
                    >
                      <Stat label="Vehicle" value={mission.vehicle} />
                      <Stat label="Mode" value={telemetry.mode} />
                      <Stat label="Signal" value={telemetry.signal} />
                      <Stat
                        label="Roll"
                        value={`${telemetry.rollDeg.toFixed(1)}°`}
                      />
                      <Stat
                        label="Pitch"
                        value={`${telemetry.pitchDeg.toFixed(1)}°`}
                      />
                      <Stat
                        label="Yaw"
                        value={`${telemetry.yawDeg.toFixed(1)}°`}
                      />
                      <Stat
                        label="Altitude"
                        value={`${telemetry.altM.toFixed(1)} m`}
                      />
                      <Stat
                        label="Speed"
                        value={`${telemetry.speedMS.toFixed(2)} m/s`}
                      />
                      <Stat
                        label="Battery"
                        value={`${telemetry.batteryPct.toFixed(0)}%`}
                      />
                      <Stat
                        label="Home distance"
                        value={`${telemetry.homeDistM.toFixed(1)} m`}
                      />
                    </dl>
                  ) : (
                    <p className="ms-hint">
                      Run the simulation to view telemetry.
                    </p>
                  )}
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem value="route">
                <AccordionHeader>
                  <AccordionTrigger>
                    Route — {mission.waypoints.length} waypoints
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionPanel>
                  <Progress value={pct} aria-label="Route progress">
                    <ProgressTrack>
                      <ProgressIndicator />
                    </ProgressTrack>
                  </Progress>
                  <p className="ms-hint" data-testid="ms-route-progress">
                    {pct.toFixed(0)}% · {plan.totalDist.toFixed(1)} m · run{" "}
                    {runIndex + 1}/{settings.runTimes}
                  </p>
                  <ol
                    className=" [list-style:none] m-[0.5rem_0_0] p-0 flex flex-col gap-[0.125rem] max-h-[16.25rem] overflow-y-auto text-[0.75rem]"
                    data-testid="ms-route-list"
                  >
                    {mission.waypoints.map((wp) => (
                      <li
                        key={wp.id}
                        className={[
                          currentSeq === wp.seq && (running || paused)
                            ? "is-active"
                            : "",
                          "flex flex-col gap-px p-[0.1875rem_0.375rem] rounded-(--radius) [&.is-active]:bg-(--accent) [&.is-active]:text-(--primary) [&.is-active]:font-semibold",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        data-testid="ms-route-item"
                      >
                        <span>
                          {wp.seq} — ({wp.x.toFixed(1)}, {wp.y.toFixed(1)},{" "}
                          {wp.z.toFixed(1)})
                        </span>
                        {wp.actions.length > 0 ? (
                          <span className="ms-hint">
                            {wp.actions.map((a) => a.label).join(" · ")}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                  <p className="ms-hint">
                    END —{" "}
                    {mission.returnHomeOnEnd ? "Return home" : "Land in place"}
                  </p>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
            <p className="ms-hint">
              {settings.runTimes}× run ·{" "}
              {settings.speedFactor.toFixed(2).replace(/\.?0+$/, "")}× speed ·
              wind {settings.windMS} m/s ·{" "}
              {settings.reducedMotion ? "reduced motion" : "full motion"}
              {settings.mockFailureAtSeq > 0
                ? ` · failure at WP ${settings.mockFailureAtSeq}`
                : ""}
            </p>
          </TabsPanel>

          <TabsPanel value="events">
            {fired.length === 0 ? (
              <section className="ms-card" role="status">
                <h3 className="ms-card-title">No events yet</h3>
                <p className="ms-hint">
                  Events appear here during a run — waypoint arrivals, actions,
                  and return home.
                </p>
              </section>
            ) : (
              <ol
                className=" [list-style:none] m-0 p-0 flex flex-col gap-[0.25rem]"
                aria-label="Simulation events"
              >
                {fired.map((ev, i) => (
                  <li key={`${ev.t}-${i}`}>
                    <button
                      type="button"
                      className=" w-full flex gap-[0.5rem] items-baseline text-left text-[0.75rem] bg-(--background) text-(--foreground) [border:0.0625rem_solid_var(--border)] rounded-(--radius) p-[0.375rem_0.5rem] cursor-pointer [&:hover]:bg-(--accent) focus-visible:[outline:0.125rem_solid_var(--primary)] focus-visible:outline-offset-1"
                      onClick={() => onSelectEvent(ev)}
                      aria-label={`Focus ${ev.label}`}
                    >
                      <span className="ms-event-t">{ev.t.toFixed(1)}s</span>
                      <span>{ev.label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </TabsPanel>

          {showConsole ? (
            <TabsPanel value="console">
              <ol
                className=" [list-style:none] m-0 p-[0.5rem] flex flex-col gap-[0.1875rem] max-h-[20rem] overflow-y-auto font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[0.6875rem] bg-(--background) [border:0.0625rem_solid_var(--border)] rounded-(--radius)"
                aria-label="Simulation console"
              >
                {log.length === 0 ? (
                  <li className="ms-hint">Console is empty — start a run.</li>
                ) : (
                  log.map((line, i) => (
                    <li key={i} data-testid="ms-console-line">
                      <span className="ms-event-t">[{line.t.toFixed(1)}s]</span>{" "}
                      {line.text}
                    </li>
                  ))
                )}
              </ol>
            </TabsPanel>
          ) : null}
        </Tabs>
      )}

      {status === "completed" ? (
        <p className="ms-issue is-ok" role="status">
          Mission run completed. Restart to replay.{" "}
          {autoRestartIn !== null ? (
            <>
              Restart simulation in {autoRestartIn} seconds.{" "}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAutoRestartIn(null)}
                aria-label="Cancel automatic restart"
              >
                Cancel
              </Button>
            </>
          ) : null}
        </p>
      ) : null}
      {status === "failed" ? (
        <p className="ms-issue is-error" role="alert">
          Run failed — design preserved. Adjust settings or Restart.{" "}
          {autoRestartIn !== null ? (
            <>
              Restart simulation in {autoRestartIn} seconds.{" "}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAutoRestartIn(null)}
                aria-label="Cancel automatic restart"
              >
                Cancel
              </Button>
            </>
          ) : null}
        </p>
      ) : null}
      {status === "aborted" ? (
        <p className="ms-issue is-warning" role="status">
          Run aborted by operator — not completed. Restart to replay.
        </p>
      ) : null}

      <div
        className=" flex flex-wrap gap-[0.375rem] p-[0.625rem_0.75rem] [border-top:0.0625rem_solid_var(--border)] bg-(--card) sticky bottom-0"
        data-testid="ms-run-footer"
      >
        {!running && !paused ? (
          <Button
            size="sm"
            variant="default"
            onClick={ended ? onRestart : onRun}
            disabled={!plan}
            aria-label={ended ? "Restart simulation" : "Run simulation"}
          >
            <PlayIcon aria-hidden="true" />{" "}
            {ended ? "Restart" : "Run Simulation"}
          </Button>
        ) : null}
        {running ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={onPause}
              aria-label="Pause simulation"
            >
              <PauseIcon aria-hidden="true" /> Pause
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAbort}
              aria-label="Abort simulation"
            >
              <StopIcon aria-hidden="true" /> Abort
            </Button>
          </>
        ) : null}
        {paused ? (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={onResume}
              aria-label="Resume simulation"
            >
              <PlayIcon aria-hidden="true" /> Resume
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAbort}
              aria-label="Abort simulation"
            >
              <StopIcon aria-hidden="true" /> Abort
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onRestart}
              aria-label="Restart simulation"
            >
              <ArrowCounterClockwiseIcon aria-hidden="true" /> Restart
            </Button>
          </>
        ) : null}
      </div>
      <p className="ms-foot-note">
        Flight path, LiDAR, and telemetry estimates follow simulation time.
      </p>
    </div>
  );
}
