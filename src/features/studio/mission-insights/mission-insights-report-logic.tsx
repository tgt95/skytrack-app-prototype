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
  safeArtifactLocation,
} from "./mission-insights-report-data";
import { DetailSection } from "./mission-insights-page-sections";
import { Badge } from "skytrack-ui/badge";
import { CaretRightIcon } from "@phosphor-icons/react";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "skytrack-ui/collapsible";
import { KeyValueList } from "./mission-insights-report-shared.tsx";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
} from "skytrack-ui/code-block";

export function MissionLogicTab({ sample }: { sample: MissionInsightSample }) {
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

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DetailSection
        title="Mission logic"
        toolbar={
          <Badge
            className="rounded-(--radius)"
            count={
              definition.authoring_mode === "design"
                ? "UI design plan"
                : "Python script"
            }
            status="secondary"
          />
        }
      >
        <p className="m-0 text-sm text-muted-foreground">
          {numberValue(file.size_bytes)?.toLocaleString() ?? "—"} B ·{" "}
          {missionLogicLineCount(sample)} lines · {missionLogicLanguage(sample)}
        </p>
        <Collapsible className="w-full">
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-(--radius) border border-border px-3 py-2 text-left font-medium">
            <span>Artifact details</span>
            <CaretRightIcon
              aria-hidden="true"
              className="shrink-0 transition-transform duration-100 ease-out group-data-panel-open:rotate-90"
            />
          </CollapsibleTrigger>
          <CollapsiblePanel className="overflow-hidden">
            <div className="border border-t-0 border-border p-3">
              <KeyValueList
                rows={[
                  ["Authoring mode", textValue(definition.authoring_mode)],
                  ["Entrypoint", textValue(definition.entrypoint, "—")],
                  [
                    "SDK",
                    sdk.name
                      ? `${textValue(sdk.name)} ${textValue(sdk.version, "")}`
                      : "—",
                  ],
                  ["Source revision", textValue(revision.value)],
                  ["File URI", safeArtifactLocation(file)],
                  [
                    "Availability",
                    textValue(availability.state, "Not supplied"),
                  ],
                  ["SHA-256", textValue(sourceArtifact.sha256, "Not supplied")],
                  [
                    "Local path",
                    <span key="path" className="text-muted-foreground">
                      —
                    </span>,
                  ],
                ]}
              />
            </div>
          </CollapsiblePanel>
        </Collapsible>
        <CodeBlock size="sm" lineNumbers startLine={1}>
          <CodeBlockHeader>
            <CodeBlockTitle>
              {textValue(file.name, "Source code")}
            </CodeBlockTitle>
            <CodeBlockActions>
              <CodeBlockCopyButton value={source} />
            </CodeBlockActions>
          </CodeBlockHeader>
          <CodeBlockContent className="h-[28rem]">{source}</CodeBlockContent>
        </CodeBlock>
      </DetailSection>
    </div>
  );
}
