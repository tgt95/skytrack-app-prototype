import { BrainIcon, CaretDownIcon, SparkleIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { SkyTooltip } from "../../shared/sky-tooltip";
import { PythonEditor } from "./python-editor";

export interface CodeInspectorPanelProps {
  codeLang: "python" | "json";
  codeDraft: string;
  jsonDraft: string;
  jsonError: string | null;
  onCodeLangChange: (lang: "python" | "json") => void;
  onCodeDraftChange: (text: string) => void;
  onJsonDraftChange: (text: string) => void;
  onApplyJson: () => void;
  onExportJson: () => void;
}

export default function CodeInspectorPanel({
  codeLang,
  codeDraft,
  jsonDraft,
  jsonError,
  onCodeLangChange,
  onCodeDraftChange,
  onJsonDraftChange,
  onApplyJson,
  onExportJson,
}: CodeInspectorPanelProps) {
  return (
    <section
      className=" flex flex-col flex-[1_1_auto] min-h-0 overflow-hidden [border:0.0625rem_solid_var(--border)] rounded-(--radius) bg-(--background)"
      aria-label="Mission script"
    >
      <div
        className=" flex items-center justify-between gap-[0.75rem] p-[0.5rem_0.625rem] [border-bottom:0.0625rem_solid_var(--border)] font-semibold text-[0.875rem]"
        data-testid="ms-python-head"
      >
        <label
          htmlFor={codeLang === "json" ? "ms-json-editor" : "ms-code-editor"}
        >
          {codeLang === "json" ? "Mission JSON" : "Mission script"}
        </label>
        <div
          className="flex items-center gap-[0.5rem]"
          role="group"
          aria-label="Mission script actions"
        >
          <SkyTooltip>
            <Button
              className="relative bg-transparent! inline-flex items-center justify-center gap-[0.4375rem] [border:0] rounded-(--radius) p-[0.375rem_0.5rem] text-(--foreground) text-[0.8125rem] disabled:opacity-[0.8] disabled:cursor-not-allowed"
              size="icon-xs"
              variant="ghost"
              disabled
              title="AI script assistance"
              aria-label="AI script assistance"
            >
              <BrainIcon
                aria-hidden="true"
                className="w-[1.1875rem] h-[1.1875rem]"
              />
              <SparkleIcon
                aria-hidden="true"
                className="w-[0.625rem] h-[0.625rem] ml-[-0.625rem] mt-[-0.75rem]"
              />
            </Button>
          </SkyTooltip>
          <div role="group" aria-label="Code language">
            <Button
              className="inline-flex items-center justify-center gap-[0.4375rem] [border:0] rounded-(--radius) p-[0.375rem_0.5rem] text-(--foreground) bg-(--card) text-[0.8125rem] disabled:opacity-[0.8] disabled:cursor-not-allowed"
              size="sm"
              variant={codeLang === "python" ? "default" : "outline"}
              aria-label="Show Python draft"
              onClick={() => onCodeLangChange("python")}
            >
              Python
            </Button>
            <Button
              className="inline-flex items-center justify-center gap-[0.4375rem] [border:0] rounded-(--radius) p-[0.375rem_0.5rem] text-(--foreground) bg-(--card) text-[0.8125rem] disabled:opacity-[0.8] disabled:cursor-not-allowed"
              size="sm"
              variant={codeLang === "json" ? "default" : "outline"}
              aria-label="Show Mission JSON"
              onClick={() => onCodeLangChange("json")}
            >
              JSON <CaretDownIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
      {codeLang === "json" ? (
        <>
          <textarea
            id="ms-json-editor"
            className=" w-full box-border font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[0.75rem] leading-[1.5] text-(--foreground) bg-(--card) [border:0.0625rem_solid_var(--border)] rounded-(--radius) p-[0.5rem] resize-y"
            aria-label="Mission JSON draft"
            aria-describedby="ms-json-hint"
            aria-invalid={jsonError ? true : undefined}
            value={jsonDraft}
            onChange={(event) => onJsonDraftChange(event.target.value)}
            spellCheck={false}
            rows={18}
          />
          {jsonError ? (
            <p className="ms-issue is-error" role="alert" id="ms-json-error">
              {jsonError}
            </p>
          ) : null}
          <div className="ms-btnrow">
            <Button
              size="sm"
              variant="outline"
              onClick={onExportJson}
              aria-label="Refresh Mission JSON from current mission"
            >
              Refresh from mission
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={onApplyJson}
              aria-label="Apply Mission JSON to visual mission"
            >
              Apply JSON
            </Button>
          </div>
          <p className="ms-python-limit" id="ms-json-hint">
            Mission JSON round-trips the visual mission, including generated
            Area/Avoid provenance. Applying valid JSON updates the visual route
            and can be undone. Invalid JSON leaves the mission unchanged.
          </p>
        </>
      ) : (
        <>
          <PythonEditor value={codeDraft} onChange={onCodeDraftChange} />
          <p className="ms-python-limit" id="ms-code-limit">
            Local draft only. Python does not execute or update the visual
            route. Mission save does not include this draft.
          </p>
        </>
      )}
    </section>
  );
}
