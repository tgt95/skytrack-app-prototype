/* simulation-panel.tsx — right inspector for the Simulation stage:
   Details / Events / (Console in Code mode) tabs, settings, run footer. */

import { useEffect, useState } from "react";
import {
  ArrowCounterClockwiseIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "skytrack-ui/tabs";
import SimulationDetails from "./simulation-details";
import type { StudioMission } from "../../domain/mission-model";
import {
  type SimEventItem,
  type SimLogLine,
  type SimPlan,
  type SimSettings,
  type SimStatus,
  type Telemetry,
} from "./simulation";

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

export { SimulationSettingsForm } from "./simulation-settings-form";
export type { SimulationSettingsFormProps } from "./simulation-settings-form";

/** Countdown (seconds) before the panel auto-restarts a completed/failed run. */
export const AUTO_RESTART_DELAY_S = 5;

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

  return (
    <div className="ms-inspector" data-testid="ms-sim-panel">
      {!plan ? (
        <section className="ms-card" role="status">
          <h3 className="heading ms-card-title">Simulation locked</h3>
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
            <SimulationDetails
              mission={mission}
              plan={plan}
              telemetry={telemetry}
              status={status}
              simT={simT}
              totalT={totalT}
              runIndex={runIndex}
              settings={settings}
            />
          </TabsPanel>

          <TabsPanel value="events">
            {fired.length === 0 ? (
              <section className="ms-card" role="status">
                <h3 className="heading ms-card-title">No events yet</h3>
                <p className="ms-hint">
                  Events appear here during a run — waypoint arrivals, actions,
                  and return home.
                </p>
              </section>
            ) : (
              <ol
                className=" [list-style:none] m-0 p-0 flex flex-col gap-1"
                aria-label="Simulation events"
              >
                {fired.map((ev, i) => (
                  <li key={`${ev.t}-${i}`}>
                    <button
                      type="button"
                      className=" w-full flex gap-2 items-baseline text-left text-xs bg-(--background) text-(--foreground) border border-border rounded-(--radius) py-1.5 px-2 cursor-pointer [&:hover]:bg-(--accent) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1"
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
                className=" [list-style:none] m-0 p-2 flex flex-col gap-0.75 max-h-80 overflow-y-auto font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-sm bg-(--background) border border-border rounded-(--radius)"
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
        className=" flex flex-wrap gap-1.5 py-2.5 px-3 border-t border-t-border bg-(--card) sticky bottom-0"
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
