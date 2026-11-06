import { Fragment } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import {
  LibraryEmptyState,
  LibraryPageHeader,
  LibraryPageLayout,
} from "@/features/library/cards/library-presentation.tsx";
import { getTemplateThumbnail } from "@/features/library/cards/template-thumbnails.ts";
import type { LibTemplate } from "@/features/library/database/store";

export default function TemplatesPage({
  activeTemplate,
  templates,
  query,
  debouncedQuery,
  renderTemplate,
  onQueryChange,
  onBack,
  onUseTemplate,
  onOpenTemplate,
}: {
  activeTemplate: LibTemplate | null;
  templates: LibTemplate[];
  query: string;
  debouncedQuery: string;
  renderTemplate: (
    template: LibTemplate,
    testId: string,
    onOpen: () => void,
    hideMeta?: boolean,
  ) => React.ReactNode;
  onQueryChange: (query: string) => void;
  onBack: () => void;
  onUseTemplate: (template: LibTemplate) => void;
  onOpenTemplate: (id: string) => void;
}) {
  if (activeTemplate)
    return (
      <LibraryPageLayout
        titleId="ms-lib-template-title"
        header={
          <LibraryPageHeader
            titleId="ms-lib-template-title"
            title={activeTemplate.title}
            description={
              <p className="ms-lib-sub mt-1 mx-0 mb-0 text-sm text-(--muted-foreground)">
                {activeTemplate.byline} · full template content arrives with
                backend templates
              </p>
            }
            context={
              <button type="button" className="ms-lib-back inline-flex items-center gap-1.5 mb-0 py-1 px-0 [border:0] bg-transparent text-(--muted-foreground) text-[0.8125rem] cursor-pointer hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-(--sidebar-ring) focus-visible:outline-offset-1" onClick={onBack}>
                <ArrowLeftIcon aria-hidden="true" /> Mission templates
              </button>
            }
            actions={
              <Button
                size="default"
                variant="default"
                onClick={() => onUseTemplate(activeTemplate)}
              >
                Use template
              </Button>
            }
          />
        }
      >
        <div
          className=" grid grid-cols-[minmax(17.5rem,30rem)_minmax(0,1fr)] gap-5 [align-items:start] [@media_(max-width:_61.25rem)]:grid-cols-[1fr]"
          data-testid="ms-lib-detail"
        >
          <span
            className={[
              `ms-lib-thumb relative flex items-center justify-center aspect-4/3 overflow-hidden text-(--muted-foreground) bg-(--background) bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem)] border-b border-b-border [&.is-template]:bg-none [&.is-project]:bg-none [&.is-project]:bg-(--muted) [&.tint-0]:bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] [&.tint-2]:bg-(--muted) [&.tint-4]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] [&.tint-5]:bg-[color-mix(in_srgb,var(--primary)_32%,var(--muted))] [&.is-learn]:bg-none [&.is-learn]:text-(--primary) is-template large tint-${activeTemplate.id.charCodeAt(1) % 6}`,
              "[.ms-lib-thumb&]:border [.ms-lib-thumb&]:border-border [.ms-lib-thumb&]:rounded-(--radius)",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            <img
              src={getTemplateThumbnail(activeTemplate.id)}
              alt=""
              className="ms-template-thumbnail absolute inset-0 block w-full h-full object-cover rounded-(--radius)"
            />
          </span>
          <div
            className=" flex flex-col gap-2 min-w-0"
            data-testid="ms-lib-detail-body"
          >
            <p
              className=" m-0 text-[0.8125rem] leading-[1.6]"
              data-testid="ms-lib-desc"
            >
              {activeTemplate.desc}
            </p>
          </div>
        </div>
      </LibraryPageLayout>
    );

  return (
    <LibraryPageLayout
      titleId="ms-lib-templates-page-title"
      header={
        <LibraryPageHeader
          titleId="ms-lib-templates-page-title"
          title="Mission templates"
          description={
            <p className="ms-lib-sub mt-1 mx-0 mb-0 text-sm text-(--muted-foreground)">
              Learn SkyTrack with Mission templates
            </p>
          }
          footer={
            <div
              className=" [.ms-lib-page-header-footer_>_&]:max-w-120 max-w-80 my-3 mx-0"
              data-testid="ms-lib-search"
            >
              <FieldRoot name="template-search">
                <FieldLabel className="ms-sr absolute w-px h-px overflow-hidden [clip:rect(0_0_0_0)] whitespace-nowrap">Search templates</FieldLabel>
                <FieldControl
                  value={query}
                  onValueChange={(value) =>
                    onQueryChange(typeof value === "string" ? value : "")
                  }
                  placeholder="Search templates"
                  aria-label="Search templates"
                />
              </FieldRoot>
            </div>
          }
        />
      }
    >
      {debouncedQuery.trim() ? (
        <p className="ms-lib-sub mt-1 mx-0 mb-0 text-sm text-(--muted-foreground)">
          {templates.length} result{templates.length === 1 ? "" : "s"} for
          &ldquo;{debouncedQuery.trim()}&rdquo;
        </p>
      ) : null}
      {templates.length === 0 ? (
        <LibraryEmptyState
          title="No templates found"
          description={`No templates match "${debouncedQuery.trim()}".`}
        />
      ) : (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
          aria-label="Mission templates"
        >
          {templates.map((template) => (
            <Fragment key={template.id}>
              {renderTemplate(template, `ms-lib-template-${template.id}`, () =>
                onOpenTemplate(template.id),
              )}
            </Fragment>
          ))}
        </div>
      )}
    </LibraryPageLayout>
  );
}
