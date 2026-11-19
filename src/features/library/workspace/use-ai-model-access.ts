import { useMemo } from "react";
import type { AIModelCardModel } from "@/ui/components/ai-model-card";

export function useAIModelAccess(
  models: AIModelCardModel[],
  canEditSharedModels: boolean,
  currentUserName: string,
) {
  return useMemo(
    () =>
      models.map((model) => ({
        ...model,
        isReadOnly:
          (model.origin === "workspace" || model.origin === undefined) &&
          (!canEditSharedModels ||
            (model.uploadedBy !== undefined &&
              model.uploadedBy !== currentUserName)),
      })),
    [models, canEditSharedModels, currentUserName],
  );
}
