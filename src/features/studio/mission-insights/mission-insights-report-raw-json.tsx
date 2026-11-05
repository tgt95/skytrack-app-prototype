import { type MissionInsightSample } from "./mission-insights-data";
import { reportForSample } from "./mission-insights-report-data";
import { useMemo, useState, useEffect } from "react";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { BracketsCurlyIcon, MagnifyingGlassIcon, ArrowLeftIcon, ArrowRightIcon, ClipboardIcon, FileCodeIcon } from "@phosphor-icons/react";
import { DetailSection } from "./mission-insights-page-sections";
import { Badge } from "skytrack-ui/badge";
import { FieldRoot, FieldLabel } from "skytrack-ui/field";
import { Input } from "skytrack-ui/input";
import { Button } from "skytrack-ui/button";
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from "skytrack-ui/scroll-area";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "skytrack-ui/collapsible";

export function jsonPropertyLines(key: string, value: unknown, hasNext: boolean) {
  const lines = JSON.stringify({ [key]: value }, null, 2)
    .split(/\r?\n/)
    .slice(1, -1);
  if (hasNext && lines.length)
    lines[lines.length - 1] = `${lines[lines.length - 1]},`;
  return lines;
}

export function RawJsonTab({ sample }: { sample: MissionInsightSample }) {
  const report = reportForSample(sample);
  const entries = Object.entries(report);
  const lines = useMemo(
    () => JSON.stringify(report, null, 2).split(/\r?\n/),
    [report],
  );
  const [search, setSearch] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [expandAll, setExpandAll] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [copyNotice, setCopyNotice] = useState("");
  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? lines.flatMap((line, index) =>
          line.toLowerCase().includes(query) ? [index] : [],
        )
      : [];
  }, [lines, search]);

  useEffect(() => {
    setMatchIndex(0);
  }, [search]);

  useEffect(() => {
    const lineNumber = matches[matchIndex];
    if (lineNumber === undefined) return;
    const match = document.getElementById(`ms-json-line-${lineNumber + 1}`);
    match?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [matchIndex, matches, expandAll]);

  const keyLineStarts = new Map<string, number>();
  entries.forEach(([key]) => {
    const marker = `  ${JSON.stringify(key)}:`;
    keyLineStarts.set(
      key,
      lines.findIndex((line) => line.startsWith(marker)),
    );
  });
  const matchingKeys = new Set(
    matches.map((lineIndex) => {
      let result = entries[0]?.[0] ?? "";
      for (const [key, start] of keyLineStarts) {
        if (start <= lineIndex) result = key;
        else break;
      }
      return result;
    }),
  );

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopyNotice("Sanitized report JSON copied.");
    } catch {
      setCopyNotice("Could not copy report JSON.");
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mission-insights-${sample.key}-sample.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const highlight = (line: string, query: string) => {
    if (!query) return line;
    const start = line.toLowerCase().indexOf(query.toLowerCase());
    if (start < 0) return line;
    return (
      <>
        {line.slice(0, start)}
        <mark className="bg-(--accent) text-(--accent-foreground)">
          {line.slice(start, start + query.length)}
        </mark>
        {line.slice(start + query.length)}
      </>
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Alert variant="warning" role="note">
        <BracketsCurlyIcon className="size-5 shrink-0" aria-hidden="true" />
        <AlertDescription>
          This is the sanitized prototype report sample. Precise geographic
          coordinates and private host/network identity values are redacted; the
          JSON is not the selected run's manifest.
        </AlertDescription>
      </Alert>
      <DetailSection
        title="Mission Insight report (.json)"
        toolbar={
          <Badge
            className="rounded-(--radius)"
            count={`${lines.length.toLocaleString()} lines`}
            status="secondary"
          />
        }
      >
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
          <FieldRoot className="min-w-0 flex-1">
            <FieldLabel className="text-xs sub-heading">Search JSON</FieldLabel>
            <Input
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              startAdornment={<MagnifyingGlassIcon aria-hidden="true" />}
              placeholder="Search keys and values"
              aria-label="Search JSON"
            />
          </FieldRoot>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-(--muted-foreground)" aria-live="polite">
              {search ? `${matches.length} matching lines` : "No search active"}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!matches.length}
              aria-label="Previous JSON match"
              onClick={() =>
                setMatchIndex(
                  (index) => (index - 1 + matches.length) % matches.length,
                )
              }
            >
              <ArrowLeftIcon aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!matches.length}
              aria-label="Next JSON match"
              onClick={() =>
                setMatchIndex((index) => (index + 1) % matches.length)
              }
            >
              <ArrowRightIcon aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (expandAll) {
                  setExpandAll(false);
                  setExpandedKeys(new Set());
                } else {
                  setExpandAll(true);
                }
              }}
            >
              {expandAll ? "Collapse all" : "Expand all"}
            </Button>
            <Button variant="outline" size="sm" onClick={copyJson}>
              <ClipboardIcon aria-hidden="true" />
              Copy JSON
            </Button>
            <Button variant="outline" size="sm" onClick={downloadJson}>
              <FileCodeIcon aria-hidden="true" />
              Download sample
            </Button>
          </div>
        </div>
        {copyNotice ? (
          <p className="m-0 text-(--muted-foreground)" role="status">
            {copyNotice}
          </p>
        ) : null}
        <ScrollArea className="h-[34rem] min-w-0 rounded-(--radius) border border-border bg-(--background)">
          <ScrollAreaViewport>
            <ScrollAreaContent className="min-w-max gap-0 p-0 font-mono text-xs leading-5">
              <div
                className="flex min-w-max items-start px-3 py-2 text-(--muted-foreground)"
                id="ms-json-line-1"
              >
                <span className="w-14 shrink-0 select-none text-right tabular-nums">
                  1
                </span>
                <span className="pl-4">&#123;</span>
              </div>
              {entries.map(([key, value], entryIndex) => {
                const propertyLines = jsonPropertyLines(
                  key,
                  value,
                  entryIndex < entries.length - 1,
                );
                const firstLine = keyLineStarts.get(key) ?? 1;
                const matched = matchingKeys.has(key);
                const isOpen = expandAll || matched || expandedKeys.has(key);
                const keyLine =
                  propertyLines[0] ??
                  `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
                const detailLines = propertyLines.slice(1);
                const collapsedValue =
                  value !== null && typeof value === "object"
                    ? Array.isArray(value)
                      ? "[ … ]"
                      : "{ … }"
                    : JSON.stringify(value);
                return (
                  <Collapsible
                    key={key}
                    open={isOpen}
                    onOpenChange={(open) => {
                      setExpandedKeys((current) => {
                        const next = new Set(current);
                        if (open) next.add(key);
                        else next.delete(key);
                        return next;
                      });
                    }}
                  >
                    <CollapsibleTrigger
                      id={`ms-json-line-${firstLine + 1}`}
                      className={`flex min-w-max items-start border-0 bg-transparent px-3 py-1 text-left text-foreground ${
                        matches[matchIndex] === firstLine
                          ? "bg-(--accent)/30"
                          : ""
                      }`}
                    >
                      <span className="w-14 shrink-0 select-none text-right tabular-nums text-(--muted-foreground)">
                        {firstLine + 1}
                      </span>
                      <span className="pl-4">
                        {highlight(
                          isOpen
                            ? keyLine
                            : `  ${JSON.stringify(key)}: ${collapsedValue}`,
                          search,
                        )}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsiblePanel>
                      <pre className="m-0 min-w-max px-3 py-1 text-xs leading-5">
                        {detailLines.map((line, lineIndex) => {
                          const globalIndex = firstLine + lineIndex + 1;
                          const lineNumber = globalIndex + 1;
                          const selectedMatch =
                            matches[matchIndex] === globalIndex;
                          return (
                            <span
                              key={`${key}-${lineIndex}`}
                              id={`ms-json-line-${lineNumber}`}
                              className={`flex min-w-max px-0 ${
                                selectedMatch
                                  ? "bg-(--accent)/30 text-foreground"
                                  : ""
                              }`}
                            >
                              <span className="w-14 shrink-0 select-none pr-3 text-right tabular-nums text-(--muted-foreground)">
                                {lineNumber}
                              </span>
                              <span className="pl-4">
                                {highlight(line, search)}
                              </span>
                            </span>
                          );
                        })}
                      </pre>
                    </CollapsiblePanel>
                  </Collapsible>
                );
              })}
              <div className="flex min-w-max items-start px-3 py-2 text-(--muted-foreground)">
                <span className="w-14 shrink-0 select-none text-right tabular-nums">
                  {lines.length}
                </span>
                <span className="pl-4">&#125;</span>
              </div>
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
