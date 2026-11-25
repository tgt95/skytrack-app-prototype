import { Fragment } from "react";
import { FolderOpenIcon } from "@phosphor-icons/react";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "skytrack-ui/empty";
import { PageHeader } from "skytrack-ui/page-header";
import { LibraryPageLayout } from "@/features/library/cards/library-presentation.tsx";
import type { LibMission } from "@/features/library/database/store";

type MissionEntry = { projectId: string; project: string; mission: LibMission };

export default function RecentPage({
  missions,
  renderMission,
}: {
  missions: MissionEntry[];
  renderMission: (entry: MissionEntry, testId: string) => React.ReactNode;
}) {
  return (
    <LibraryPageLayout
      titleId="ms-lib-recent-page-title"
      header={
        <PageHeader
          className="sticky top-0 z-20 ms-lib-page-header flex flex-col gap-2 px-6 pb-4 pt-5"
          data-testid="ms-lib-page-header-row"
          title={
            <span id="ms-lib-recent-page-title" data-testid="ms-lib-page-header-copy">
              Recent
            </span>
          }
        />
      }
    >
      {missions.length === 0 ? (
        <Empty>
          <EmptyMedia icon={FolderOpenIcon} />
          <EmptyTitle
            data-testid="ms-lib-empty-title"
            role="heading"
            aria-level={2}
          >
            No recent missions
          </EmptyTitle>
          <EmptyDescription>Missions in this Workspace will appear here.</EmptyDescription>
        </Empty>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5"
          aria-label="Recent missions"
        >
          {missions.map((entry) => (
            <Fragment key={entry.mission.id}>
              {renderMission(entry, `ms-lib-recent-page-${entry.mission.id}`)}
            </Fragment>
          ))}
        </div>
      )}
    </LibraryPageLayout>
  );
}
