import { Fragment } from "react";
import {
  LibraryEmptyState,
  LibraryPageHeader,
  LibraryPageLayout,
} from "../cards/library-presentation.tsx";
import type { LibMission } from "../database/store";

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
        <LibraryPageHeader titleId="ms-lib-recent-page-title" title="Recent" />
      }
    >
      {missions.length === 0 ? (
        <LibraryEmptyState
          title="No recent missions"
          description="Missions in this Workspace will appear here."
        />
      ) : (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
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
