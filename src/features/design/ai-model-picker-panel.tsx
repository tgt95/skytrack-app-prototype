import {
  CheckIcon,
  CopyIcon,
  PlusIcon,
  XIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "skytrack-ui/button";
import { CheckboxIndicator, CheckboxRoot } from "skytrack-ui/checkbox";
import { Input } from "skytrack-ui/input";
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger,
} from "skytrack-ui/tooltip";
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "skytrack-ui/select";
import {
  AIModelCardContent,
  getAIModelPath,
  type AIModelCardModel,
} from "../../ui/components/ai-model-card";

type SourceFilter = "all" | "skytrack" | "members" | "me";

const SOURCE_ITEMS = [
  { value: "all", label: "All sources" },
  { value: "skytrack", label: "SkyTrack" },
  { value: "members", label: "Members" },
  { value: "me", label: "Me" },
] as const;

export function AIModelPickerPanel({
  panelWidth = 400,
  models,
  selectedModelId,
  onSelectModel,
  onImport,
  onClose,
  onAnnounce,
}: {
  panelWidth?: number;
  models: AIModelCardModel[];
  selectedModelId: string | null;
  onSelectModel: (modelId: string | null) => void;
  onImport: () => void;
  onClose: () => void;
  onAnnounce: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);
  const copiedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return models.filter((model) => {
      const matchesQuery = model.name
        .toLocaleLowerCase()
        .includes(normalizedQuery);
      const matchesSource =
        source === "all" ||
        (source === "skytrack" && model.origin === "skytrack") ||
        (source === "members" &&
          model.origin !== "skytrack" &&
          model.origin !== "user-upload" &&
          model.uploadedBy !== "You") ||
        (source === "me" &&
          (model.origin === "user-upload" || model.uploadedBy === "You"));
      return matchesQuery && matchesSource;
    });
  }, [models, query, source]);

  useEffect(
    () => () => {
      if (copiedTimeout.current !== null) {
        clearTimeout(copiedTimeout.current);
      }
    },
    [],
  );

  const copyPath = async (model: AIModelCardModel) => {
    const path = getAIModelPath(model);
    try {
      await navigator.clipboard.writeText(path);
      setCopiedModelId(model.id);
      if (copiedTimeout.current !== null) {
        clearTimeout(copiedTimeout.current);
      }
      copiedTimeout.current = setTimeout(() => {
        setCopiedModelId(null);
        copiedTimeout.current = null;
      }, 1400);
      onAnnounce(`${model.name} path copied.`);
    } catch {
      onAnnounce("Could not copy the model path in this browser.");
    }
  };

  return (
    <aside
      className="flex min-h-0 min-w-0 flex-[0_0_25rem] flex-col overflow-hidden border-r border-border bg-(--card) [@media_(max-width:_48rem)]:[border-right:none] [@media_(max-width:_48rem)]:[border-bottom:0.0625rem_solid_var(--border)]"
      style={{ flexBasis: panelWidth, width: panelWidth }}
      aria-label="AI models"
      data-testid="ms-code-ai-models"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-3 min-h-16 bg-(--card) border-b border-border">
        <h2 className="h6">AI models</h2>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={onImport}>
            <PlusIcon aria-hidden="true" /> Model
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Close AI models"
            title="Close AI models"
            onClick={onClose}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      </header>
      <div className="flex shrink-0 items-center gap-2 p-3 pb-2.5">
        <Input
          startAdornment={<MagnifyingGlassIcon />}
          endAdornment={
            query !== "" && (
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Clear filter"
                onClick={() => setQuery("")}
              >
                <XIcon />
              </Button>
            )
          }
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search model name"
          aria-label="Search model name"
          className="min-w-0 flex-1"
        />

        <Select<SourceFilter>
          items={[...SOURCE_ITEMS]}
          value={source}
          onValueChange={(value: unknown) => {
            if (SOURCE_ITEMS.some((item) => item.value === value)) {
              setSource(value as SourceFilter);
            }
          }}
        >
          <SelectTrigger
            aria-label="Filter AI models by source"
            className="w-auto"
          >
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner side="bottom" align="end" sideOffset={4}>
              <SelectPopup>
                <SelectList>
                  {SOURCE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      <SelectItemIndicator />
                      <SelectItemText>{item.label}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectList>
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </Select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-3.5">
        {visibleModels.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {models.length === 0
              ? "No AI models available. Import a model to add one."
              : "No AI models match this search and source."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {visibleModels.map((model) => {
              const path = getAIModelPath(model);
              const selected = selectedModelId === model.id;
              return (
                <article
                  key={model.id}
                  className={`group ms-lib-card relative cursor-pointer ${
                    selected ? "border-(--primary) ring-1 ring-(--primary)" : ""
                  }`}
                  onClick={(event) => {
                    if (
                      event.target instanceof Element &&
                      event.target.closest('button, [role="checkbox"]')
                    ) {
                      return;
                    }
                    onSelectModel(selected ? null : model.id);
                  }}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData(
                      "application/x-skytrack-ai-model-path",
                      path,
                    );
                  }}
                  data-testid={`ms-code-ai-model-${model.id}`}
                >
                  <AIModelCardContent
                    model={model}
                    showThumbnail={false}
                    titleTrailing={
                      <span className="flex shrink-0 items-center gap-1">
                        <TooltipProvider>
                          <Tooltip open={copiedModelId === model.id}>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  size="icon-xs"
                                  variant="ghost"
                                  className="pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 [&:focus-visible]:pointer-events-auto [&:focus-visible]:opacity-100 [@media_(hover:_none)]:pointer-events-auto [@media_(hover:_none)]:opacity-100"
                                  aria-label={`Copy path for ${model.name}`}
                                  title="Copy path"
                                  onClick={() => void copyPath(model)}
                                />
                              }
                            >
                              <CopyIcon aria-hidden="true" />
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipPositioner side="top" sideOffset={6}>
                                <TooltipPopup>
                                  <TooltipArrow />
                                  Copied
                                </TooltipPopup>
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip>
                        </TooltipProvider>
                        <CheckboxRoot
                          checked={selected}
                          onCheckedChange={(checked) =>
                            onSelectModel(checked ? model.id : null)
                          }
                          aria-label={`${selected ? "Using" : "Use"} ${model.name} in this mission`}
                        >
                          <CheckboxIndicator aria-hidden="true">
                            <CheckIcon />
                          </CheckboxIndicator>
                        </CheckboxRoot>
                      </span>
                    }
                  />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
