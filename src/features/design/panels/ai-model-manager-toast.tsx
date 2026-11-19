import { PackageIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { SkyTooltip } from "@/ui/components/sky-tooltip";
import {
  ToastClose,
  ToastContent,
  ToastPortal,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
  createToastManager,
  useToastManager,
} from "skytrack-ui/toast";
import type { AIModelCardModel } from "@/ui/components/ai-model-card";

const aiModelToastManager = createToastManager();

function AIModelToastList() {
  const { toasts } = useToastManager();
  return toasts.map((toast) => (
    <ToastRoot key={toast.id} toast={toast}>
      <ToastContent>
        <div className="min-w-0 flex-1">
          <ToastTitle />
        </div>
        <ToastClose size="icon" variant="ghost" aria-label="Dismiss toast" />
      </ToastContent>
    </ToastRoot>
  ));
}

function AIModelManagerToastHost() {
  return (
    <ToastProvider toastManager={aiModelToastManager}>
      <ToastPortal>
        <ToastViewport className="fixed bottom-4 left-4 right-auto mx-0 flex max-w-sm flex-col-reverse">
          <AIModelToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

function notifyAIModelsAlreadyOpen() {
  aiModelToastManager.add({ title: "AI models are already open." });
}

export function getSelectedAIModels(
  models: AIModelCardModel[],
  selectedModelIds: string[],
) {
  return models.filter((model) => selectedModelIds.includes(model.id));
}

export function AIModelManagerControl({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <SkyTooltip>
        <Button
          size="icon"
          variant="ghost"
          aria-label={open ? "Close AI models" : "Manage AI models"}
          aria-pressed={open}
          onClick={() => onOpenChange(!open)}
        >
          <PackageIcon aria-hidden="true" className="size-5" />
        </Button>
      </SkyTooltip>
      <AIModelManagerToastHost />
    </>
  );
}

export function openAIModelManager(
  isOpen: boolean,
  onOpenChange: (open: boolean) => void,
) {
  if (isOpen) notifyAIModelsAlreadyOpen();
  else onOpenChange(true);
}
