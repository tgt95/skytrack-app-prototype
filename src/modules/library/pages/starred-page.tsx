import { Fragment } from "react";
import {
  LibraryEmptyState,
  LibraryPageHeader,
  LibraryPageLayout,
} from "../library-presentation";
import type { LibMission } from "../database/store";

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
        <LibraryPageHeader
          titleId="ms-lib-starred-title"
          title="Starred missions"
        />
      }
    >
      {missions.length === 0 ? (
        <LibraryEmptyState
          title="No starred missions yet"
          description="Star a mission from a project to keep it close at hand."
        />
      ) : (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6"
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
