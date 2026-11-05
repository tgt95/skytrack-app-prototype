import { type JsonRecord, asRecords, textValue, asRecord, reportForSample, numberValue, modelForId } from "./mission-insights-report-data";
import { type MissionInsightSample } from "./mission-insights-data";
import { type MissionInsightsReportTab } from "../mission-report-url";
import { statusLabel, KeyValueList } from "./mission-insights-report-shared.tsx";
import { type DataTableColumnDef, DataTable } from "skytrack-ui/data-table";
import { DetailSection } from "./mission-insights-page-sections";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { CategoryChart } from "./mission-insights-report-overview.tsx";
import { Badge } from "skytrack-ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "skytrack-ui/collapsible";
import { Separator } from "skytrack-ui/separator";
import { Button } from "skytrack-ui/button";

export function modelRows(
  report: JsonRecord,
): Array<JsonRecord & { id: string; name: string; calls: JsonRecord }> {
  return asRecords(report.ai_models).map((model) => ({
    ...model,
    id: textValue(model.model_id),
    name: textValue(model.name),
    calls: asRecord(model.invocations),
  }));
}

export function AIModelsTab({
  sample,
  onNavigate,
}: {
  sample: MissionInsightSample;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  const report = reportForSample(sample);
  const models = modelRows(report);
  const invocationKeys = ["with_results", "zero_results", "failed"] as const;
  const invocationTotals = models.reduce<
    Record<(typeof invocationKeys)[number], number>
  >(
    (totals, model) => {
      for (const key of invocationKeys) {
        totals[key] += numberValue(model.calls[key]) ?? 0;
      }
      return totals;
    },
    { with_results: 0, zero_results: 0, failed: 0 },
  );
  const detections = asRecords(report.detections_geo);
  const classCounts = new Map<string, number>();
  detections.forEach((item) => {
    const label = textValue(item.class, "Unclassified");
    classCounts.set(label, (classCounts.get(label) ?? 0) + 1);
  });
  const classRows = [...classCounts.entries()].sort((a, b) => b[1] - a[1]);
  const resultRows = [
    ["With results", invocationTotals.with_results] as const,
    ["No detections", invocationTotals.zero_results] as const,
    ["Failed", invocationTotals.failed] as const,
  ].filter(([, count]) => count > 0);
  const invocationRows = asRecords(report.invocations).map((invocation) => {
    const model = modelForId(report, textValue(invocation.model_id));
    return {
      id: textValue(invocation.invocation_id),
      model: textValue(model?.name),
      input: textValue(invocation.input_artifact_id),
      output: textValue(invocation.output_artifact_id, "—"),
      time: `${numberValue(invocation.started_s)?.toFixed(1) ?? "—"} s`,
      duration: `${numberValue(invocation.duration_ms)?.toFixed(0) ?? "—"} ms`,
      result: statusLabel(invocation.result),
      count: numberValue(invocation.result_count) ?? 0,
      error: textValue(asRecord(invocation.error).code),
    };
  });
  const invocationColumns: DataTableColumnDef<
    (typeof invocationRows)[number]
  >[] = [
    { id: "Model", accessorKey: "model", header: "Model" },
    { id: "Input", accessorKey: "input", header: "Input" },
    { id: "Result", accessorKey: "result", header: "Result" },
    {
      id: "Count",
      accessorKey: "count",
      header: "Detections",
      meta: { align: "right" },
    },
    {
      id: "Duration",
      accessorKey: "duration",
      header: "Duration",
      meta: { align: "right" },
    },
    { id: "Failure", accessorKey: "error", header: "Failure" },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DetailSection title="Model activity">
        <Alert variant="info" role="note">
          <AlertDescription>
            Detection counts are prototype fixture outputs. They are not
            ground-truth labels and do not establish model accuracy.
          </AlertDescription>
        </Alert>
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
          <CategoryChart
            title="Invocations by result"
            rows={resultRows}
            unit="Invocations"
          />
          <CategoryChart
            title="Detections by class"
            rows={classRows}
            unit="Detections"
          />
        </div>
      </DetailSection>
      <DetailSection
        title="Model inventory"
        toolbar={
          <Badge
            className="rounded-(--radius)"
            count={`${models.length} configured`}
            status="secondary"
          />
        }
      >
        <div className="flex min-w-0 flex-col gap-3">
          {models.map((model) => {
            const invocations = asRecords(report.invocations).filter(
              (item) => item.model_id === model.id,
            );
            const invoked = numberValue(model.calls.total) ?? 0;
            return (
              <Collapsible
                key={model.id}
                className="min-w-0 rounded-(--radius) border border-border bg-(--background)"
                defaultOpen={false}
              >
                <CollapsibleTrigger className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 p-4 text-left">
                  <span className="min-w-0">
                    <span className="block text-lg font-medium text-foreground">
                      {model.name}{" "}
                      <span className="text-(--muted-foreground)">
                        {textValue(model.version, "")}
                      </span>
                    </span>
                    <span className="mt-1 block text-(--muted-foreground)">
                      {invoked
                        ? `${invoked} invocations · ${
                            numberValue(model.detections) ?? 0
                          } detections`
                        : "Configured · no invocation recorded"}
                    </span>
                  </span>
                  <Badge
                    className="rounded-(--radius)"
                    count={invoked ? "Invoked" : "Not invoked"}
                    status={invoked ? "success" : "outline"}
                  />
                </CollapsibleTrigger>
                <CollapsiblePanel className="border-t border-border p-4">
                  <div className="flex min-w-0 flex-col gap-4">
                    <KeyValueList
                      rows={[
                        ["Model ID", <code key="id">{model.id}</code>],
                        ["Task", textValue(model.task)],
                        ["Producer", textValue(model.producer_type)],
                        [
                          "Execution location",
                          textValue(model.runs_on, "Not specified"),
                        ],
                        [
                          "Inputs processed",
                          `${numberValue(model.inputs_processed) ?? 0}`,
                        ],
                        ["Detections", `${numberValue(model.detections) ?? 0}`],
                        [
                          "Mean · p95 duration",
                          model.mean_duration_ms === undefined
                            ? "—"
                            : `${numberValue(
                                model.mean_duration_ms,
                              )} ms · ${numberValue(model.p95_duration_ms)} ms`,
                        ],
                        [
                          "SHA-256",
                          <code key="sha">{textValue(model.sha256)}</code>,
                        ],
                      ]}
                    />
                    <Separator />
                    <h4 className="m-0 text-base font-medium text-foreground">
                      Invocations
                    </h4>
                    <DataTable
                      columns={invocationColumns}
                      data={invocations
                        .map((item) =>
                          invocationRows.find(
                            (row) => row.id === item.invocation_id,
                          ),
                        )
                        .filter((row): row is (typeof invocationRows)[number] =>
                          Boolean(row),
                        )}
                      getRowId={(row) => row.id}
                      pageSize={8}
                      searchPlaceholder={`Search ${model.name} invocations`}
                      emptyMessage="No invocations are recorded for this model."
                      className="min-w-0"
                    />
                    {invoked ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="self-start"
                        onClick={() => onNavigate("media-files")}
                      >
                        View captures and detections in Media & Files
                      </Button>
                    ) : (
                      <p className="m-0 text-(--muted-foreground)">
                        No invocation output exists for this configured model in
                        the sample.
                      </p>
                    )}
                  </div>
                </CollapsiblePanel>
              </Collapsible>
            );
          })}
        </div>
      </DetailSection>
    </div>
  );
}
