import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "skytrack-ui/accordion";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "skytrack-ui/progress";
import type { StudioMission } from "../../domain/mission-model";
import type {
  SimPlan,
  SimSettings,
  SimStatus,
  Telemetry,
} from "./simulation-types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ms-stat">
      <dt className="text-[0.6875rem] text-(--muted-foreground)">{label}</dt>
      <dd className="m-0 text-xs font-semibold overflow-hidden text-ellipsis">
        {value}
      </dd>
    </div>
  );
}

export interface SimulationDetailsProps {
  mission: StudioMission;
  plan: SimPlan;
  telemetry: Telemetry | null;
  status: SimStatus;
  simT: number;
  totalT: number;
  runIndex: number;
  settings: SimSettings;
}

export default function SimulationDetails({
  mission,
  plan,
  telemetry,
  status,
  simT,
  totalT,
  runIndex,
  settings,
}: SimulationDetailsProps) {
  const running = status === "running";
  const paused = status === "paused";
  const pct = totalT > 0 ? Math.min(100, (simT / totalT) * 100) : 0;
  const currentSeq = telemetry?.targetSeq ?? null;
  return (
    <>
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
                className="m-0 grid grid-cols-[1fr_1fr] gap-y-1.5 gap-x-2.5"
                data-testid="ms-telemetry"
              >
                <Stat label="Vehicle" value={mission.vehicle} />
                <Stat label="Mode" value={telemetry.mode} />
                <Stat label="Signal" value={telemetry.signal} />
                <Stat label="Roll" value={`${telemetry.rollDeg.toFixed(1)}°`} />
                <Stat
                  label="Pitch"
                  value={`${telemetry.pitchDeg.toFixed(1)}°`}
                />
                <Stat label="Yaw" value={`${telemetry.yawDeg.toFixed(1)}°`} />
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
              <p className="ms-hint">Run the simulation to view telemetry.</p>
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
              className=" [list-style:none] mt-2 mx-0 mb-0 p-0 flex flex-col gap-0.5 max-h-65 overflow-y-auto text-xs"
              data-testid="ms-route-list"
            >
              {mission.waypoints.map((wp) => (
                <li
                  key={wp.id}
                  className={[
                    currentSeq === wp.seq && (running || paused)
                      ? "is-active"
                      : "",
                    "flex flex-col gap-px py-0.75 px-1.5 rounded-(--radius) [&.is-active]:bg-(--accent) [&.is-active]:text-(--primary) [&.is-active]:font-semibold",
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
              END — {mission.returnHomeOnEnd ? "Return home" : "Land in place"}
            </p>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      <p className="ms-hint">
        {settings.runTimes}× run ·{" "}
        {settings.speedFactor.toFixed(2).replace(/\.?0+$/, "")}× speed · wind{" "}
        {settings.windMS} m/s ·{" "}
        {settings.reducedMotion ? "reduced motion" : "full motion"}
        {settings.mockFailureAtSeq > 0
          ? ` · failure at WP ${settings.mockFailureAtSeq}`
          : ""}
      </p>
    </>
  );
}
