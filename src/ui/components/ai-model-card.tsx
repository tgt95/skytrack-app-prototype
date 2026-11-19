import type { ReactNode } from "react";
import { PackageIcon } from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "skytrack-ui/avatar";
import cocoCommonObjectsImage from "@/assets/ai-models/coco-common-objects.jpg";
import fireExplosionImage from "@/assets/ai-models/fire-explosion-detection.jpg";
import skytrackLogo from "@/assets/skytrack-logo.svg";
import visdroneObjectsImage from "@/assets/ai-models/visdrone-objects.jpg";

const sampleModelImages: Record<string, string> = {
  "Common Objects Detection": cocoCommonObjectsImage,
  "Fire and Explosion Detection": fireExplosionImage,
  "Objects Detection by Drones": visdroneObjectsImage,
};

export interface AIModelCardModel {
  id: string;
  name: string;
  origin?: "skytrack" | "workspace" | "user-upload";
  uploadedBy?: string;
  isReadOnly?: boolean;
  description?: string;
  version: string;
  task: string;
  inputModality: string;
  compatibility: string;
  status: string;
  assetReference: string;
  packageFileName?: string;
  packageFileSize?: number;
  thumbnailDataUrl?: string;
}

export function getAIModelPath(model: AIModelCardModel): string {
  return model.assetReference || model.packageFileName || `models/${model.id}`;
}

export function AIModelCardContent({
  model,
  showThumbnail = true,
  titleTrailing,
  layout = "stacked",
}: {
  model: AIModelCardModel;
  showThumbnail?: boolean;
  titleTrailing?: ReactNode;
  layout?: "stacked" | "picker";
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
  const isSkyTrack = attribution === "SkyTrack";
  const thumbnail = model.thumbnailDataUrl || sampleModelImages[model.name];
  const description = model.description ?? (isUploadedByMe ? model.task : "");
  const placeholderIconSize = layout === "picker" ? "w-10 h-10" : "w-5 h-5";

  const thumbnailContent = thumbnail ? (
    <img src={thumbnail} alt="" className="size-full object-cover" />
  ) : (
    <PackageIcon aria-hidden="true" className={placeholderIconSize} />
  );
  const attributionContent = (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <Avatar aria-hidden="true" className="size-6">
        {isSkyTrack ? (
          <AvatarImage src={skytrackLogo} alt="" />
        ) : (
          <AvatarFallback className="text-[0.625rem] font-bold">
            {initial}
          </AvatarFallback>
        )}
      </Avatar>
      <span className="truncate">{attribution}</span>
    </span>
  );

  if (layout === "picker") {
    return (
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-3 p-3">
          {showThumbnail ? (
            <span className="flex aspect-video h-11.5 flex-none items-center justify-center overflow-hidden rounded-(--radius) bg-(--muted) text-(--muted-foreground)">
              {thumbnailContent}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <span className="flex min-w-0 items-center gap-1">
              <span
                className={`min-w-0 flex-1 truncate text-sm font-medium ${model.isReadOnly ? "text-muted-foreground" : "text-foreground"}`}
              >
                {model.name}
              </span>
              {titleTrailing}
            </span>
            {description ? (
              <span className="truncate text-sm text-muted-foreground">
                {description}
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border px-3 py-2">
          {attributionContent}
          {model.isReadOnly ? (
            <Badge size="sm" count="View only" status="outline" />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      {showThumbnail ? (
        <span className="ms-lib-resource-icon relative flex items-center justify-center w-full aspect-video border-b border-b-border bg-(--muted) text-(--muted-foreground) overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            thumbnailContent
          )}
        </span>
      ) : null}
      <span className="ms-lib-card-body flex flex-col gap-1 p-3 min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {model.name}
          </span>
          {titleTrailing}
        </span>
        {description ? (
          <span className="text-sm text-muted-foreground">{description}</span>
        ) : null}
        {isUploadedByMe ? (
          <span className="text-sm text-muted-foreground">
            {`${model.packageFileSize ? `${(model.packageFileSize / (1024 * 1024)).toFixed(1)} MB` : "Package size unavailable"} · ${model.status}`}
          </span>
        ) : null}
        <span className="mt-1">{attributionContent}</span>
      </span>
    </>
  );
}
