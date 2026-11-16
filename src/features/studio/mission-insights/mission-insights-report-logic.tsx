import { CheckCircleIcon } from "@phosphor-icons/react";
import { type MissionInsightSample } from "./mission-insights-data";
import {
  reportForSample,
  asRecord,
  reportArtifacts,
  missionLogicSource,
  textValue,
  numberValue,
  missionLogicLineCount,
  missionLogicLanguage,
} from "./mission-insights-report-data";
import {
  copyableArtifactPath,
  displayLocalPath,
} from "./mission-insights-report-media-path";
import { MediaPathActions } from "./mission-insights-report-media-path-actions";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import { KeyValueList } from "./mission-insights-report-shared.tsx";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
} from "skytrack-ui/code-block";

export function MissionLogicTab({
  sample,
  onApply,
}: {
  sample: MissionInsightSample;
  onApply: () => void;
}) {
  const report = reportForSample(sample);
  const definition = asRecord(report.mission_definition);
  const file = asRecord(definition.definition_file);
  const sdk = asRecord(definition.sdk);
  const revision = asRecord(definition.source_revision);
  const sourceArtifact =
    reportArtifacts(report).find(
      (artifact) => artifact.artifact_id === definition.definition_artifact_id,
    ) ?? {};
  const availability = asRecord(asRecord(sourceArtifact).availability);
  const source = missionLogicSource(sample);
  const language = missionLogicLanguage(sample);
  const lineCount = missionLogicLineCount(sample);
  const availabilityState = textValue(availability.state, "Not supplied");
  const fileSize = numberValue(file.size_bytes);
  const localPath = displayLocalPath(sourceArtifact);
  const sdkValue = sdk.name
    ? `${textValue(sdk.name)} ${textValue(sdk.version, "")}`
    : "—";

  return (
    <div className="grid w-full min-w-0 grid-cols-1 bg-card lg:grid-cols-[minmax(0,2.4fr)_minmax(300px,400px)]">
      <section className="flex min-w-0 flex-col gap-4 border-b border-border p-6 lg:border-b-0 lg:border-r">
        <header className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="h4 m-0">Mission logic</h2>
          <Badge
            className="rounded-(--radius)"
            count={
              definition.authoring_mode === "design"
                ? "UI design plan"
                : "Python script"
            }
            status="secondary"
          />
        </header>
        <CodeBlock size="sm" lineNumbers startLine={1}>
          <CodeBlockHeader>
            <CodeBlockActions>
              <Button variant="outline" size="sm" onClick={onApply}>
                Apply to Mission Design
              </Button>
              <CodeBlockCopyButton value={source} />
            </CodeBlockActions>
          </CodeBlockHeader>
          <CodeBlockContent
            language={language.toLowerCase()}
            className="h-[38rem] max-h-[70vh]"
          >
            {source}
          </CodeBlockContent>
        </CodeBlock>
      </section>
      <section className="flex min-w-0 flex-col gap-4 p-6">
        <h2 className="h4 m-0">Metadata</h2>
        <KeyValueList
          columns="grid-cols-1"
          rows={[
            [
              "File size",
              fileSize === null
                ? "Not supplied"
                : `${fileSize.toLocaleString()} B`,
            ],
            ["Line count", `${lineCount} lines`],
            ...(definition.authoring_mode === "design"
              ? ([["Authored in", "Mission Studio · Design"]] as const)
              : ([
                  ["Entrypoint", textValue(definition.entrypoint, "—")],
                  ["SDK", sdkValue],
                ] as const)),
            ["Source revision", textValue(revision.value)],
            [
              "Availability",
              <span
                key="availability"
                className="inline-flex items-center gap-1.5 text-xs text-foreground"
              >
                {availabilityState === "local" ? (
                  <CheckCircleIcon
                    className="size-4 shrink-0 text-success"
                    weight="fill"
                    aria-hidden="true"
                  />
                ) : (
                  <Badge dot status="secondary" />
                )}
                {availabilityState === "local" ? "Local" : availabilityState}
              </span>,
            ],
            ...(definition.authoring_mode === "design"
              ? []
              : ([
                  [
                    "Local path",
                    <span
                      className="flex min-w-0 items-center gap-2"
                      key="path"
                    >
                      <code
                        className="min-w-0 flex-1 truncate text-foreground"
                        title={localPath}
                      >
                        {localPath}
                      </code>
                      <MediaPathActions
                        value={localPath}
                        copyValue={copyableArtifactPath(sourceArtifact)}
                      />
                    </span>,
                  ],
                ] as const)),
          ]}
        />
      </section>
    </div>
  );
}
