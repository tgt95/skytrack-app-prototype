import { Fragment } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { LibraryPageHeader, LibraryPageLayout } from "../library-presentation";
import type { LibMission, LibTemplate } from "../database/store";

type MissionEntry = { projectId: string; project: string; mission: LibMission };

export function HomePage({
  missions,
  templates,
  renderRecent,
  renderTemplate,
  onViewAll,
  onOpenTemplate,
}: {
  missions: MissionEntry[];
  templates: LibTemplate[];
  renderRecent: (entry: MissionEntry, testId: string) => React.ReactNode;
  renderTemplate: (
    template: LibTemplate,
    testId: string,
    onOpen: () => void,
    hideMeta: boolean,
  ) => React.ReactNode;
  onViewAll: () => void;
  onOpenTemplate: (id: string) => void;
}) {
  return (
    <LibraryPageLayout
      titleId="ms-lib-home-title"
      header={
        <LibraryPageHeader
          titleId="ms-lib-home-title"
          variant="plain"
          title="Welcome to SkyTrack"
        />
      }
    >
      <section aria-labelledby="ms-lib-recent-title" className="mb-8">
        <div className="ms-section-header">
          <h2
            id="ms-lib-recent-title"
            className="h6 m-0"
          >
            Recent missions
          </h2>
        </div>
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
          role="list"
          aria-label="Recent missions"
        >
          {missions.slice(0, 5).map((entry) => (
            <Fragment key={entry.mission.id}>
              {renderRecent(entry, `ms-lib-recent-${entry.mission.id}`)}
            </Fragment>
          ))}
        </div>
      </section>
      <section aria-labelledby="ms-lib-templates-title">
        <div className="ms-section-header">
          <h2
            id="ms-lib-templates-title"
            className="h6 m-0"
          >
            Mission templates
          </h2>
          <button
            type="button"
            className=" focus-visible:[outline:0.125rem_solid_var(--sidebar-ring)] focus-visible:outline-offset-1 inline-flex items-center gap-[0.25rem] [border:0] bg-transparent text-(--foreground) text-[0.8125rem] font-semibold cursor-pointer p-[0.25rem] [&:hover]:text-(--primary)"
            data-testid="ms-lib-view-all"
            onClick={onViewAll}
          >
            View all <CaretRightIcon aria-hidden="true" />
          </button>
        </div>
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
          role="list"
          aria-label="Mission templates preview"
        >
          {templates.slice(0, 6).map((template) => (
            <Fragment key={template.id}>
              {renderTemplate(
                template,
                `ms-lib-template-${template.id}`,
                () => onOpenTemplate(template.id),
                true,
              )}
            </Fragment>
          ))}
        </div>
      </section>
    </LibraryPageLayout>
  );
}
