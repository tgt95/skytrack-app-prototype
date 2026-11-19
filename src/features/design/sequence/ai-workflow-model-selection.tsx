import { InfoIcon } from "@phosphor-icons/react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "skytrack-ui/alert";
import { Button } from "skytrack-ui/button";
import { FieldLabel, FieldRoot } from "skytrack-ui/field";
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
import type { AIModelCardModel } from "@/ui/components/ai-model-card";

export function AIWorkflowModelSelection({
  workflowId,
  modelId,
  models,
  onModelChange,
  onManageAIModels,
}: {
  workflowId: string;
  modelId: string | null;
  models: AIModelCardModel[];
  onModelChange: (modelId: string | null) => void;
  onManageAIModels: () => void;
}) {
  if (models.length === 0) {
    return (
      <Alert role="status" className="p-3">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="grid min-w-0 flex-1 gap-1">
          <AlertTitle>No AI models selected</AlertTitle>
          <AlertDescription>Select models to use in this AI flow.</AlertDescription>
          <AlertAction className="ml-0 mt-2 self-start">
            <Button size="sm" variant="outline" onClick={onManageAIModels}>
              Manage models
            </Button>
          </AlertAction>
        </div>
      </Alert>
    );
  }

  return (
    <FieldRoot name={`ai-model-${workflowId}`}>
      <div className="flex flex-row items-center justify-between gap-3 w-full">
        <FieldLabel className="min-w-0">AI model</FieldLabel>
        <Button
          className="shrink-0 p-0! h-auto!"
          size="sm"
          variant="link"
          onClick={onManageAIModels}
        >
          Manage models
        </Button>
      </div>
      <Select
        items={models.map((model) => ({ value: model.id, label: model.name }))}
        value={modelId ?? ""}
        onValueChange={(value: unknown) => {
          if (typeof value === "string") onModelChange(value || null);
        }}
      >
        <SelectTrigger aria-label="AI model" className="w-full">
          <SelectValue placeholder="Choose AI model" />
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner side="bottom" align="start" sideOffset={4}>
            <SelectPopup>
              <SelectList>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <SelectItemIndicator />
                    <SelectItemText>
                      {model.name}
                      {model.origin === "skytrack"
                        ? " · SkyTrack"
                        : model.origin === "user-upload"
                          ? " · You"
                          : ""}
                    </SelectItemText>
                  </SelectItem>
                ))}
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </FieldRoot>
  );
}
