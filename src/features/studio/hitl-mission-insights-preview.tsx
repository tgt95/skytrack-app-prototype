import { useId, type ReactNode } from "react";
import { InfoIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { Badge } from "skytrack-ui/badge";
import { PageHeader } from "skytrack-ui/page-header";
import { Toolbar, ToolbarButton, ToolbarGroup } from "skytrack-ui/toolbar";

const readinessChecks = [
  {
    label: "Flight scope",
    detail: "Isolated HIL profile; sequence mode off",
  },
  {
    label: "Flight Controller safety",
    detail: "FC device safe, disarmed, and no failsafe",
  },
  {
    label: "Mission Computer command path",
    detail: "Takeoff and land actions with MQTT trace",
  },
  {
    label: "HIL runtime",
    detail: "FC/MC transport and Gazebo HIL runtime ready",
  },
  {
    label: "Positioning source",
    detail: "Fresh GPS reference",
  },
] as const;

const flightMetrics = [
  ["Takeoff target", "2.0 m"],
  ["Peak altitude", "2.04 m"],
  ["Hold time", "5.0 s"],
  ["Actuator rate", "180 Hz"],
  ["Duration", "38.1 s"],
] as const;

const versionDetails = [
  ["Hardware", "Jetson Orin NX + Pixhawk FMUv6X"],
  ["FC firmware", "PX4 1.16.0 · SHA-256 3c87c230…f77c0"],
  ["HIL profile", "jetson-orin-nx-fmuv6x"],
  ["Gazebo world / model", "skytrack_hitl_layout_4_lite.sdf · minipro"],
  ["HIL camera chain", "Enabled"],
] as const;

const evidenceDetails = [
  ["Evidence folder", "runs/20261022T151204Z/"],
  [
    "Files",
    "manifest.json · readiness.json · observation/telemetry.sqlite · checksums.sha256",
  ],
] as const;

function DetailSection({
  title,
  toolbar,
  children,
  className = "",
}: {
  title: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();

  return (
    <section
      className={`flex min-w-0 flex-col gap-4 rounded-(--radius) border border-border bg-(--card) p-6 ${className}`}
      aria-labelledby={headingId}
    >
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="h4 m-0">
          {title}
        </h2>
        {toolbar ? (
          <div className="flex min-w-0 items-center gap-2">{toolbar}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function KeyValueList({
  values,
  mono = false,
}: {
  values: ReadonlyArray<readonly [string, string]>;
  mono?: boolean;
}) {
  return (
    <dl className="m-0 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {values.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-(--muted-foreground)">{label}</dt>
          <dd className={`m-0 mt-1 break-words ${mono ? "font-mono" : ""}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function HitlMissionInsightsPreview() {
  const comparisonRows = [
    ["Result", "Succeeded", "PASS"],
    ["Duration", "37.3 s", "38.1 s"],
    ["Takeoff target / peak", "2.0 m", "2.0 m · peak 2.04 m"],
  ] as const;

  return (
    <section
      className="flex w-full min-w-0 flex-col gap-0"
      aria-label="Mission Insights"
      data-testid="ms-hitl-insights-preview"
    >
      <PageHeader
        className="sm:[&_[data-slot=page-header-main]]:!flex-row"
        title="Mission Insights"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="rounded-(--radius)"
              count="HITL"
              status="outline"
            />
            <Badge
              className="rounded-(--radius)"
              count="PASS"
              status="success"
            />
            <Toolbar
              aria-label="Mission Insights actions"
              className="border-0 bg-transparent p-0"
            >
              <ToolbarGroup>
                <ToolbarButton
                  size="sm"
                  disabled
                  title="Unavailable in this static preview"
                >
                  Export report
                </ToolbarButton>
              </ToolbarGroup>
            </Toolbar>
          </div>
        }
      >
        <p className="m-0 text-(--muted-foreground)">
          Mini A8 Pro · Oct 22, 2026 - 15:12
        </p>
      </PageHeader>

      <div className="flex w-full min-w-0 flex-col gap-6 p-6">
        <Alert variant="info" role="note">
          <InfoIcon className="size-5 shrink-0" aria-hidden="true" />
          <AlertDescription>
            Static layout preview. Status labels and values are illustrative
            only, are not an approved operational classification, and are not
            linked to the selected run.
          </AlertDescription>
        </Alert>

        <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
          <DetailSection
            title="Readiness"
            toolbar={
              <Badge
                className="rounded-(--radius)"
                count="5 / 5 verdicts"
                status="secondary"
              />
            }
          >
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {readinessChecks.map((check) => (
                <li
                  key={check.label}
                  className="flex min-w-0 items-start justify-between gap-4 border-t border-border pt-3 first:border-0 first:pt-0"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium">{check.label}</span>
                    <span className="text-(--muted-foreground)">
                      {check.detail}
                    </span>
                  </div>
                  <Badge
                    className="rounded-(--radius)"
                    count="PASS"
                    status="success"
                  />
                </li>
              ))}
            </ul>
          </DetailSection>

          <DetailSection title="Flight">
            <dl className="m-0 grid min-w-0 grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 xl:grid-cols-5">
              {flightMetrics.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-(--muted-foreground)">{label}</dt>
                  <dd className="m-0 mt-1 text-lg font-semibold tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex min-w-0 flex-col gap-3 border-t border-border pt-4">
              <h3 className="m-0 text-lg font-medium text-(--foreground)">
                MQTT command & action trace
              </h3>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <code className="font-mono">uav/cmd/takeoff</code>
                  <p className="m-0 flex flex-wrap gap-x-2 gap-y-1">
                    <span>accepted</span>
                    <span aria-hidden="true">→</span>
                    <span>feedback</span>
                    <span aria-hidden="true">→</span>
                    <span>result success</span>
                  </p>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <code className="font-mono">uav/cmd/land</code>
                  <p className="m-0 flex flex-wrap gap-x-2 gap-y-1">
                    <span>accepted</span>
                    <span aria-hidden="true">→</span>
                    <span>result success</span>
                  </p>
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection
            title="Comparison with simulation"
            className="sm:col-span-2"
          >
            <p className="m-0 text-(--muted-foreground)">
              Illustrative comparison. Parity metrics are not produced by the
              current HITL collector.
            </p>
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[38rem] border-collapse text-left">
                <caption className="sr-only">
                  Illustrative comparison between a simulation run and a HITL
                  run
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="p-3 font-medium">
                      Metric
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      Sim run - 10222026-143859
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      HITL run · sample
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(([metric, simulation, hitl]) => (
                    <tr
                      key={metric}
                      className="border-b border-border last:border-0"
                    >
                      <th scope="row" className="p-3 font-medium">
                        {metric}
                      </th>
                      <td className="p-3">{simulation}</td>
                      <td className="p-3">
                        {metric === "Result" ? (
                          <Badge
                            className="rounded-(--radius)"
                            count={hitl}
                            status="success"
                          />
                        ) : (
                          hitl
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailSection>

          <DetailSection title="Versions">
            <KeyValueList values={versionDetails} />
          </DetailSection>

          <DetailSection
            title="Evidence"
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <span>Checksums verified</span>
                <Badge
                  className="rounded-(--radius)"
                  count="PASS"
                  status="success"
                />
              </div>
            }
          >
            <KeyValueList values={evidenceDetails} mono />
          </DetailSection>
        </div>
      </div>
    </section>
  );
}
