import { Fragment } from "react";
import { FolderOpenIcon } from "@phosphor-icons/react";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "skytrack-ui/empty";
import { PageHeader } from "skytrack-ui/page-header";
import { LibraryPageLayout } from "@/features/library/cards/library-presentation.tsx";
import type { LibMission } from "@/features/library/database/store";

type MissionEntry = { projectId: string; project: string; mission: LibMission };

export default function StarredPage({
  missions,
  renderMission,
}: {
  missions: MissionEntry[];
  renderMission: (entry: MissionEntry, testId: string) => React.ReactNode;
}) {
  return (
    <LibraryPageLayout
      titleId="ms-lib-starred-title"
      header={
        <PageHeader
          className="sticky top-0 z-20 ms-lib-page-header flex flex-col gap-2 px-6 pb-4 pt-5"
          data-testid="ms-lib-page-header-row"
          title={
            <span id="ms-lib-starred-title" data-testid="ms-lib-page-header-copy">
              Starred missions
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
            No starred missions yet
          </EmptyTitle>
          <EmptyDescription>
            Star a mission from a project to keep it close at hand.
          </EmptyDescription>
        </Empty>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
          aria-label="Starred missions"
        >
          {missions.map((entry) => (
            <Fragment key={entry.mission.id}>
              {renderMission(entry, `ms-lib-starred-${entry.mission.id}`)}
            </Fragment>
          ))}
        </div>
      )}
    </LibraryPageLayout>
  );
}
