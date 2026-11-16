import { useId, useState, type ReactNode } from "react";
import {
  CaretRightIcon,
  CheckIcon,
  InfoIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerDescription,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "skytrack-ui/drawer";
import type { InsightOutput } from "./mission-insights-output-data";
import type {
  InsightIssue,
  MissionInsightSample,
} from "./mission-insights-data";
import { MissionInsightsOutputPreview } from "./mission-insights-output-preview";

export function DetailSection({
  title,
  toolbar,
  children,
  className = "",
}: {
  title: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <section
      className={`flex min-w-0 flex-col gap-4 rounded-(--radius) not-[.no-border]:border not-[.no-border]:border-border bg-(--card) p-6 shadow-xs ${className} `}
      aria-labelledby={headingId}
    >
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div id={headingId} className="h4">
          {title}
        </div>
        {toolbar ? (
          <div className="flex min-w-0 items-center gap-2">{toolbar}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function statusVariant(severity: InsightIssue["severity"]) {
  if (severity === "Error") return "error";
  if (severity === "Warning") return "warning";
  return "secondary";
}

export function MissionInsightsRunSummary({
  sample,
  className = "",
}: {
  sample: MissionInsightSample;
  className?: string;
}) {
  let headline = sample.outcomeTitle;
  let supportingText = "";
  let facts: ReadonlyArray<readonly [string, string]> = [
    ["Outcome details", sample.outcome],
    ["Run duration", sample.duration],
  ];

  if (
    !sample.demoCase &&
    sample.status === "Succeeded" &&
    sample.outcomeTitle === "Mission completed"
  ) {
    const [progress, ...details] = sample.outcome.split(" · ");
    headline = progress || sample.outcomeTitle;
    facts = [
      ...(details.length > 0
        ? ([["Landing", details.join(" · ")]] as const)
        : []),
      ["Run duration", sample.duration],
    ];
  } else if (!sample.demoCase && sample.status === "Failed") {
    const [statusHeadline, ...statusDetails] = sample.outcomeTitle.split(" · ");
    headline = statusHeadline || sample.outcomeTitle;
    supportingText = statusDetails
      .join(" · ")
      .replace(/\s+at \d+(?:\.\d+)? s$/i, "");
    const [progress, ...details] = sample.outcome.split(" · ");
    facts = [
      ["Mission progress", progress || sample.outcome],
      ...(details.length > 0
        ? [["Flight end state", details.join(" · ")] as const]
        : []),
      ["Run duration", sample.duration],
    ];
  }

  const isFailed = sample.status === "Failed";
  const isSucceeded = sample.status === "Succeeded";
  const ResultIcon = isFailed
    ? WarningIcon
    : isSucceeded
      ? CheckIcon
      : InfoIcon;
  const resultTone = isFailed
    ? "text-destructive"
    : isSucceeded
      ? "text-success"
      : "text-muted-foreground";
  const factColumns =
    facts.length >= 3 ? "sm:grid-cols-2 2xl:grid-cols-3" : "sm:grid-cols-2";

  return (
    <DetailSection title="Mission result" className={className}>
      <div className="flex min-w-0 flex-row items-center gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className={`grid size-14 shrink-0 place-items-center rounded-full border-1 ${resultTone}`}
          >
            <ResultIcon className="size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={`m-0 text-sm font-medium ${resultTone}`}>
              {sample.status}
            </p>
            <div className="flex flex-col items-baseline gap-1">
              <div className="m-0 break-words h5">{headline}</div>
              {supportingText ? (
                <p className="m-0 break-words text-muted-foreground">
                  {supportingText}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {/* <div className='h-px w-full bg-border' /> */}
        <div className="shrink-0 bg-border w-px h-auto self-stretch" />
        {facts.length > 0 ? (
          <dl
            className={`m-0 min-w-0 flex flex-[auto_1_auto] gap-x-4 gap-y-4 ${factColumns}`}
          >
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="m-0 mt-1 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </DetailSection>
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
        {sample.outputs.length === 0 ? (
          <Alert className="col-span-full">
            <AlertDescription>
              {sample.demoCase
                ? "No outputs were produced before the run stopped."
                : "No outputs are available for this run."}
            </AlertDescription>
          </Alert>
        ) : null}
        {sample.outputs.map((output) => (
          <section
            key={output.id}
            className="flex min-w-0 flex-col gap-3 rounded-(--radius) border border-border bg-(--background) p-4"
            aria-labelledby={`ms-output-card-${output.id}`}
          >
            <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <h3
                id={`ms-output-card-${output.id}`}
                className="m-0 text-lg font-medium text-foreground"
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
            <p className="m-0 text-muted-foreground">{output.summary}</p>
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
  onViewIssue,
  className = "",
}: {
  sample: MissionInsightSample;
  onViewIssue: (issueCode: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const summaryBadges = sample.issuesSummary
    .split(" · ")
    .filter((summary) => !summary.toLowerCase().startsWith("top "));

  return (
    <>
      <button
        type="button"
        className={`flex min-w-0 w-full items-center gap-4 rounded-(--radius) border border-border bg-(--card) px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="min-w-0 h6">Top issues</span>
        <span className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {summaryBadges.length ? (
            summaryBadges.map((summary) => (
              <Badge
                key={summary}
                className="rounded-(--radius)"
                count={summary}
                status={
                  /error|mismatch/i.test(summary)
                    ? "error"
                    : /warning|gap|missing/i.test(summary)
                      ? "warning"
                      : "secondary"
                }
              />
            ))
          ) : (
            <Badge
              className="rounded-(--radius)"
              count="No issues"
              status="success"
            />
          )}
        </span>
        <CaretRightIcon
          className="size-4 shrink-0 text-muted-foreground ml-auto"
          aria-hidden="true"
        />
      </button>
      <Drawer open={open} onOpenChange={setOpen} swipeDirection="right">
        <DrawerPortal>
          <DrawerBackdrop />
          <DrawerViewport side="right">
            <DrawerPopup
              side="right"
              className="w-[min(38rem,calc(100vw-1rem))] max-w-full"
              aria-label="Mission issues"
            >
              <DrawerContent className="flex h-full min-h-0 flex-col gap-4">
                <header className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <DrawerTitle className="h4 m-0">Top issues</DrawerTitle>
                    <DrawerDescription className="mt-2">
                      {sample.issueTotal}{" "}
                      {sample.issueTotal === 1 ? "issue" : "issues"} recorded
                      for this run.
                    </DrawerDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setOpen(false)}
                  >
                    <XIcon aria-hidden="true" />
                  </Button>
                </header>
                {sample.issues.length ? (
                  <ul className="m-0 min-h-0 flex-1 list-none divide-y divide-border overflow-y-auto p-0">
                    {sample.issues.map((issue) => (
                      <li
                        key={issue.code}
                        className="flex min-w-0 flex-col items-start gap-3 py-4"
                      >
                        <div className="w-20">
                          <Badge
                            count={issue.severity}
                            status={statusVariant(issue.severity)}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 font-medium">
                            <code className="break-all">{issue.code}</code>
                          </p>
                          <p className="m-0 mt-1 break-words text-muted-foreground">
                            {issue.message}
                          </p>
                          <p className="m-0 mt-2 tabular-nums text-sm text-muted-foreground">
                            {issue.time === null
                              ? "Time unknown"
                              : `${issue.time.toFixed(1)} s`}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 self-start"
                          title={`View event for ${issue.code} in Timeline`}
                          onClick={() => {
                            setOpen(false);
                            onViewIssue(issue.code);
                          }}
                        >
                          View event in Timeline
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-muted-foreground">
                    No issues are recorded.
                  </p>
                )}
              </DrawerContent>
            </DrawerPopup>
          </DrawerViewport>
        </DrawerPortal>
      </Drawer>
    </>
  );
}
