import type { ComponentProps, ReactNode } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "skytrack-ui/empty";

export function MissionInsightsEmptyState({
  title,
  description,
  icon,
  role,
}: {
  title?: ReactNode;
  description: ReactNode;
  icon?: ComponentProps<typeof EmptyMedia>["icon"];
  role?: string;
}) {
  return (
    <Empty role={role}>
      {icon ? <EmptyMedia icon={icon} /> : null}
      {title ? <EmptyTitle>{title}</EmptyTitle> : null}
      <EmptyDescription>{description}</EmptyDescription>
    </Empty>
  );
}
