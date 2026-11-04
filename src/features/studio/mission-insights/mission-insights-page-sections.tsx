import { useId, type ReactNode } from "react";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import type { InsightOutput } from "./mission-insights-output-data";
import type {
  InsightIssue,
  MissionInsightSample,
} from "./mission-insights-data";
import { MISSION_INSIGHTS_SAMPLE_DISCLOSURE } from "./mission-insights-data";
import { MissionInsightsOutputPreview } from "./mission-insights-output-preview";

export function DetailSection({
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
  rows,
}: {
  rows: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <dl className="m-0 grid min-w-0 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-(--muted-foreground)">{label}</dt>
          <dd className="m-0 mt-1 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function statusVariant(severity: InsightIssue["severity"]) {
  if (severity === "Error") return "error";
  if (severity === "Warning") return "warning";
  return "secondary";
}

export function MissionInsightsSampleNotice() {
  return (
    <Alert variant="info" role="note">
      <AlertDescription>{MISSION_INSIGHTS_SAMPLE_DISCLOSURE}</AlertDescription>
    </Alert>
  );
}

export function MissionInsightsRunSummary({
  sample,
}: {
  sample: MissionInsightSample;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
      <DetailSection
        title="Run outcome"
        toolbar={
          <Badge
            className="rounded-(--radius)"
            count={sample.status}
            status={sample.status === "Succeeded" ? "success" : "error"}
          />
        }
      >
        <div className="flex min-w-0 flex-col gap-3">
          <p className="m-0 font-medium">{sample.outcomeTitle}</p>
          <p className="m-0 text-(--muted-foreground)">{sample.outcome}</p>
          <KeyValueList
            rows={[
              ["Type", sample.type],
              ["World", sample.world],
              ["Date", sample.date],
              ["Duration", sample.duration],
              ["Vehicle", sample.vehicle],
              ["Source", sample.source],
            ]}
          />
        </div>
      </DetailSection>

      <DetailSection title="Evidence">
        <KeyValueList
          rows={[
            ["Completeness", sample.evidenceCompleteness],
            ["Availability", sample.evidenceAvailability],
            ["Signature", sample.evidenceSignature],
          ]}
        />
      </DetailSection>
    </div>
  );
}

export function MissionInsightsOutputs({
  sample,
  onOpen,
  onOpenSurveyImages,
}: {
  sample: MissionInsightSample;
  onOpen: (output: InsightOutput) => void;
  onOpenSurveyImages: () => void;
}) {
  return (
    <DetailSection title="Outputs">
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {sample.outputs.map((output) => (
          <section
            key={output.id}
            className="flex min-w-0 flex-col gap-3 rounded-(--radius) border border-border bg-(--background) p-4"
            aria-labelledby={`ms-output-card-${output.id}`}
          >
            <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <h3
                id={`ms-output-card-${output.id}`}
                className="m-0 text-lg font-medium text-(--foreground)"
              >
                {output.name}
              </h3>
              <Badge
                className="rounded-(--radius)"
                count={output.status}
                status={output.status === "Available" ? "success" : "warning"}
              />
            </header>
            {output.preview ? (
              <MissionInsightsOutputPreview
                preview={output.preview}
                onOpenSurveyImages={
                  output.id === "survey-image-set"
                    ? onOpenSurveyImages
                    : undefined
                }
              />
            ) : null}
            <p className="m-0 text-(--muted-foreground)">{output.summary}</p>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => onOpen(output)}
            >
              Open details
            </Button>
          </section>
        ))}
      </div>
    </DetailSection>
  );
}

export function MissionInsightsTopIssues({
  sample,
  onSeek,
}: {
  sample: MissionInsightSample;
  onSeek: (requestedTime: number, label?: string) => void;
}) {
  return (
    <DetailSection
      title="Top issues"
      toolbar={
        <Badge
          className="rounded-(--radius)"
          count={sample.issuesSummary}
          status={
            sample.issues.some((issue) => issue.severity === "Error")
              ? "error"
              : "warning"
          }
        />
      }
    >
      {sample.issues.length ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {sample.issues.map((issue) => (
            <li
              key={issue.code}
              className="flex min-w-0 flex-col gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start"
            >
              <Badge
                className="rounded-(--radius) self-start"
                count={issue.severity}
                status={statusVariant(issue.severity)}
              />
              <div className="min-w-0 flex-1">
                <p className="m-0 font-medium">
                  <code>{issue.code}</code>
                </p>
                <p className="m-0 mt-1 break-words">{issue.message}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="tabular-nums text-(--muted-foreground)">
                  {issue.time === null
                    ? "Time unknown"
                    : `${issue.time.toFixed(1)} s`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={issue.time === null}
                  title={
                    issue.time === null
                      ? "No timestamp is supplied for this issue."
                      : `Seek to ${issue.time.toFixed(1)} s`
                  }
                  onClick={() => {
                    if (issue.time !== null) onSeek(issue.time, issue.code);
                  }}
                >
                  View in Replay
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-(--muted-foreground)">
          No issues are recorded for this sample.
        </p>
      )}
      {sample.issueTotal > sample.issues.length ? (
        <p className="m-0 text-(--muted-foreground)">
          Showing the top {sample.issues.length} of {sample.issueTotal} issues.
        </p>
      ) : null}
    </DetailSection>
  );
}
