import { Fragment } from "react";
import { FolderOpenIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "skytrack-ui/empty";
import { Input } from "skytrack-ui/input";
import { PageHeader } from "skytrack-ui/page-header";
import {
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
  onUseTemplate: (template: LibTemplate) => void;
  onOpenTemplate: (id: string) => void;
}) {
  if (activeTemplate)
    return (
      <LibraryPageLayout
        titleId="ms-lib-template-title"
        header={
          <div
            className="sticky top-0 z-20 border-b border-border bg-card"
            data-testid="ms-lib-page-header-row"
          >
            <PageHeader
              className="ms-lib-page-header flex flex-col gap-2 px-6 pb-0 pt-5 border-b-0"
              title={
                <span id="ms-lib-template-title" data-testid="ms-lib-page-header-copy">
                  {activeTemplate.title}
                </span>
              }
              toolbar={
                <div className="inline-flex items-center justify-end gap-2 shrink-0" data-testid="ms-lib-page-header-actions">
                  <Button
                    size="default"
                    variant="default"
                    onClick={() => onUseTemplate(activeTemplate)}
                  >
                    Use template
                  </Button>
                </div>
              }
            />
            <div className="px-6 pb-4" data-testid="ms-lib-page-header-description">
              <p className="ms-lib-sub mt-1 mx-0 mb-0 text-sm text-muted-foreground">
                {activeTemplate.byline} · full template content arrives with
                backend templates
              </p>
            </div>
          </div>
        }
      >
        <div
          className=" grid grid-cols-[minmax(17.5rem,30rem)_minmax(0,1fr)] gap-5 [align-items:start] [@media_(max-width:_61.25rem)]:grid-cols-[1fr]"
          data-testid="ms-lib-detail"
        >
          <span
            className={[
              `ms-lib-thumb relative flex items-center justify-center aspect-4/3 overflow-hidden text-muted-foreground bg-background bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem)] border-b border-b-border [&.is-template]:bg-none [&.is-project]:bg-none [&.is-project]:bg-(--muted) [&.tint-0]:bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] [&.tint-2]:bg-(--muted) [&.tint-4]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] [&.tint-5]:bg-[color-mix(in_srgb,var(--primary)_32%,var(--muted))] [&.is-learn]:bg-none [&.is-learn]:text-(--primary) is-template large tint-${activeTemplate.id.charCodeAt(1) % 6}`,
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
        <div
          className="sticky top-0 z-20 border-b border-border bg-card"
          data-testid="ms-lib-page-header-row"
        >
          <PageHeader
            className="ms-lib-page-header flex flex-col gap-2 px-6 pb-0 pt-5 border-b-0"
            title={
              <span id="ms-lib-templates-page-title" data-testid="ms-lib-page-header-copy">
                Mission templates
              </span>
            }
            toolbar={
              <div className="inline-flex items-center justify-end gap-2 shrink-0" data-testid="ms-lib-page-header-actions">
                <Input
                  startAdornment={<MagnifyingGlassIcon aria-hidden="true" />}
                  endAdornment={
                    <>
                      {query !== "" ? (
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Clear filter"
                          onClick={() => onQueryChange("")}
                        >
                          <XIcon aria-hidden="true" />
                        </Button>
                      ) : null}
                    </>
                  }
                  value={query}
                  onChange={(event) => onQueryChange(event.currentTarget.value)}
                  placeholder="Search"
                  aria-label="Search"
                  className="w-full min-w-0 max-w-120"
                  data-testid="ms-lib-search"
                />
              </div>
            }
          />
          <div className="px-6 pb-4" data-testid="ms-lib-page-header-description">
            <p className="mt-1 mx-0 text-sm text-muted-foreground">
              Learn SkyTrack with Mission templates
            </p>
          </div>
        </div>
      }
    >
      {debouncedQuery.trim() ? (
        <p className="ms-lib-sub mt-1 mx-0 mb-0 text-sm text-muted-foreground">
          {templates.length} result{templates.length === 1 ? "" : "s"} for
          &ldquo;{debouncedQuery.trim()}&rdquo;
        </p>
      ) : null}
      {templates.length === 0 ? (
        <Empty>
          <EmptyMedia icon={FolderOpenIcon} />
          <EmptyTitle
            data-testid="ms-lib-empty-title"
            role="heading"
            aria-level={2}
          >
            No templates found
          </EmptyTitle>
          <EmptyDescription>
            No templates match "{debouncedQuery.trim()}".
          </EmptyDescription>
        </Empty>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 3xl:grid-cols-5"
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
