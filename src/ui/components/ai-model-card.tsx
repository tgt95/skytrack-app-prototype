import type { ReactNode } from "react";
import { PackageIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "skytrack-ui/avatar";

export interface AIModelCardModel {
  id: string;
  name: string;
  origin?: "skytrack" | "workspace" | "user-upload";
  uploadedBy?: string;
  version: string;
  task: string;
  inputModality: string;
  compatibility: string;
  status: string;
  assetReference: string;
  packageFileName?: string;
  packageFileSize?: number;
}

export function getAIModelPath(model: AIModelCardModel): string {
  return model.assetReference || model.packageFileName || `models/${model.id}`;
}

export function AIModelCardContent({
  model,
  showThumbnail = true,
  titleTrailing,
}: {
  model: AIModelCardModel;
  showThumbnail?: boolean;
  titleTrailing?: ReactNode;
}) {
  const isUploadedByMe = model.origin === "user-upload";
  const attribution =
    model.origin === "skytrack"
      ? "SkyTrack"
      : isUploadedByMe
        ? "You"
        : model.uploadedBy || "Workspace member";
  const initial =
    attribution.trim().split(/\s+/u)[0]?.[0]?.toUpperCase() ?? "?";
  const secondaryInfo = isUploadedByMe
    ? model.packageFileName || model.assetReference
    : model.task;

  return (
    <>
      {showThumbnail ? (
        <span className="ms-lib-resource-icon">
          <PackageIcon aria-hidden="true" className="w-[2.25rem] h-[2.25rem]" />
        </span>
      ) : null}
      <span className="ms-lib-card-body min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {model.name}
          </span>
          {titleTrailing}
        </span>
        {secondaryInfo ? (
          <span className="text-xs text-muted-foreground leading-[1.5]">
            {secondaryInfo}
          </span>
        ) : null}
        <span className="text-sm text-muted-foreground">
          {isUploadedByMe
            ? `${model.packageFileSize ? `${(model.packageFileSize / (1024 * 1024)).toFixed(1)} MB` : "Package size unavailable"} · ${model.status}`
            : `${model.inputModality || "Input modality not specified"}${model.compatibility ? ` · ${model.compatibility}` : ""}`}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Avatar aria-hidden="true" className="size-6">
            <AvatarFallback className="text-[0.625rem] font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span>{attribution}</span>
        </span>
      </span>
    </>
  );
}
