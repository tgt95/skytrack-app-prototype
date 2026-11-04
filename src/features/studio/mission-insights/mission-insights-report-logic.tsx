import { type MissionInsightSample } from "./mission-insights-data";
import { reportForSample, asRecord, missionLogicSource, textValue, numberValue, missionLogicLineCount, missionLogicLanguage, safeArtifactLocation } from "./mission-insights-report-data";
import { useState } from "react";
import { DetailSection } from "./mission-insights-page-sections";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import { ClipboardIcon } from "@phosphor-icons/react";
import { Separator } from "skytrack-ui/separator";
import { KeyValueList } from "./mission-insights-report-shared.tsx";
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from "skytrack-ui/scroll-area";

export function MissionLogicTab({ sample }: { sample: MissionInsightSample }) {
  const report = reportForSample(sample);
  const definition = asRecord(report.mission_definition);
  const file = asRecord(definition.definition_file);
  const sdk = asRecord(definition.sdk);
  const revision = asRecord(definition.source_revision);
  const source = missionLogicSource(sample);
  const lines = source.replace(/\n$/, "").split(/\r?\n/);
  const [copyNotice, setCopyNotice] = useState("");

  async function copySource() {
    try {
      await navigator.clipboard.writeText(source);
      setCopyNotice(`${textValue(file.name)} copied.`);
    } catch {
      setCopyNotice(`Could not copy ${textValue(file.name)}.`);
    }
  }

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
        <header className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 font-medium">{textValue(file.name)}</p>
            <p className="m-0 mt-1 text-(--muted-foreground)">
              {numberValue(file.size_bytes)?.toLocaleString() ?? "—"} B ·{" "}
              {missionLogicLineCount(sample)} lines ·{" "}
              {missionLogicLanguage(sample)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copySource}>
            <ClipboardIcon aria-hidden="true" />
            Copy {missionLogicLanguage(sample) === "JSON" ? "JSON" : "code"}
          </Button>
        </header>
        <Separator />
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
            [
              "Sample path",
              <code key="path">{safeArtifactLocation(file)}</code>,
            ],
          ]}
        />
        {copyNotice ? (
          <p className="m-0 text-(--muted-foreground)" role="status">
            {copyNotice}
          </p>
        ) : null}
      </DetailSection>
      <DetailSection
        title="Source code"
        toolbar={
          <Badge
            className="rounded-(--radius)"
            count={`1–${lines.length} of ${lines.length} lines`}
            status="outline"
          />
        }
      >
        <p className="m-0 text-(--muted-foreground)">
          Complete prototype mission definition. Private machine paths and
          precise geographic coordinates are redacted from this sample.
        </p>
        <ScrollArea className="h-[28rem] min-w-0 rounded-(--radius) border border-border bg-(--background)">
          <ScrollAreaViewport>
            <ScrollAreaContent className="min-w-max flex-row gap-0 p-0 font-mono text-sm leading-6">
              <pre
                aria-hidden="true"
                className="m-0 select-none border-r border-border bg-(--muted)/30 px-3 py-3 text-right text-(--muted-foreground)"
              >
                {lines.map((_, index) => `${index + 1}\n`)}
              </pre>
              <pre className="m-0 min-w-0 overflow-x-auto px-4 py-3">
                <code>{source}</code>
              </pre>
            </ScrollAreaContent>
          </ScrollAreaViewport>
          <ScrollAreaScrollbar>
            <ScrollAreaThumb />
          </ScrollAreaScrollbar>
          <ScrollAreaScrollbar orientation="horizontal">
            <ScrollAreaThumb />
          </ScrollAreaScrollbar>
        </ScrollArea>
      </DetailSection>
    </div>
  );
}
