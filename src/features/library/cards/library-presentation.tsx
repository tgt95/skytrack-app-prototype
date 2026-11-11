import {
  cloneElement,
  isValidElement,
  type MouseEvent,
  type ReactNode,
} from "react";
import { DotsThreeIcon, FolderOpenIcon, StarIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuPortal,
  ContextMenuPositioner,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "skytrack-ui/context-menu";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSeparator,
  MenuTrigger,
} from "skytrack-ui/menu";
import { SkyTooltip } from "@/ui/components/sky-tooltip";
import { PageHeader } from "skytrack-ui/page-header";

export type LibraryCardAction = {
  id: string;
  label: string;
  onSelect: () => void;
  group: "primary" | "common" | "destructive";
  destructive?: boolean;
};

function renderLibraryCardActions(
  actions: LibraryCardAction[],
  contextMenu = false,
) {
  return actions.flatMap((action, index) => {
    const previousAction = actions[index - 1];
    const separator =
      previousAction && previousAction.group !== action.group ? (
        contextMenu ? (
          <ContextMenuSeparator key={`separator-${action.id}`} />
        ) : (
          <MenuSeparator key={`separator-${action.id}`} />
        )
      ) : null;
    const item = contextMenu ? (
      <ContextMenuItem
        key={action.id}
        variant={action.destructive ? "destructive" : "default"}
        onClick={action.onSelect}
      >
        {action.label}
      </ContextMenuItem>
    ) : (
      <MenuItem
        key={action.id}
        variant={action.destructive ? "destructive" : "default"}
        onClick={action.onSelect}
      >
        {action.label}
      </MenuItem>
    );
    return separator ? [separator, item] : [item];
  });
}

export function LibraryCardFrame({
  label,
  className,
  children,
  actions,
  testId,
  starred,
  onToggleStar,
  onOpen,
}: {
  label: string;
  className?: string;
  children: ReactNode;
  actions: LibraryCardAction[];
  testId?: string;
  starred?: boolean;
  onToggleStar?: () => void;
  onOpen?: () => void;
}) {
  const cardClassName = [
    "ms-lib-card relative flex flex-col w-full p-0 border border-border rounded-(--radius) bg-(--card) text-foreground text-left cursor-pointer overflow-hidden hover:border-(--primary) focus-visible:outline-2 focus-visible:outline-(--sidebar-ring) focus-visible:outline-offset-1 [&.is-readonly]:cursor-default",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (!onOpen) return;
    const target = event.target as Element;
    if (target.closest('button, a, input, textarea, select, [role="button"]'))
      return;
    onOpen();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <article
            className={cardClassName}
            aria-label={label}
            onClick={handleCardClick}
          />
        }
      >
        <span
          className={
            " absolute top-1 right-1 z-2 inline-flex gap-1 opacity-[0] pointer-events-none [transition:opacity_120ms_ease] [.ms-lib-card:hover_&]:opacity-[1] [.ms-lib-card:hover_&]:pointer-events-auto [.ms-lib-card:focus-within_&]:opacity-[1] [.ms-lib-card:focus-within_&]:pointer-events-auto [@media_(hover:_none)]:opacity-[1] [@media_(hover:_none)]:pointer-events-auto motion-reduce:[transition:none]"
          }
          onClick={(event) => event.stopPropagation()}
          data-testid="ms-lib-card-overlay-actions"
        >
          {onToggleStar ? (
            <SkyTooltip>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                data-testid={testId ? `${testId}-star` : undefined}
                aria-label={`${starred ? "Unstar" : "Star"} ${label}`}
                aria-pressed={starred}
                onClick={onToggleStar}
              >
                <StarIcon
                  aria-hidden="true"
                  className={starred ? "text-(--favorite)" : undefined}
                  weight={starred ? "fill" : "regular"}
                />
              </Button>
            </SkyTooltip>
          ) : null}
          {actions.length > 0 ? (
            <Menu>
              <SkyTooltip>
                <MenuTrigger
                  aria-label={`More actions for ${label}`}
                  data-testid={testId ? `${testId}-more` : undefined}
                  render={
                    <Button type="button" variant="outline" size="icon-sm" />
                  }
                >
                  <DotsThreeIcon aria-hidden="true" />
                </MenuTrigger>
              </SkyTooltip>
              <MenuPortal>
                <MenuPositioner side="bottom" align="end" sideOffset={4}>
                  <MenuPopup aria-label={`Actions for ${label}`}>
                    {renderLibraryCardActions(actions)}
                  </MenuPopup>
                </MenuPositioner>
              </MenuPortal>
            </Menu>
          ) : null}
        </span>
        {children}
      </ContextMenuTrigger>
      {actions.length > 0 ? (
        <ContextMenuPortal>
          <ContextMenuPositioner>
            <ContextMenuPopup aria-label={`Actions for ${label}`}>
              {renderLibraryCardActions(actions, true)}
            </ContextMenuPopup>
          </ContextMenuPositioner>
        </ContextMenuPortal>
      ) : null}
    </ContextMenu>
  );
}

export function LibraryEmptyState({
  title,
  description,
  icon,
}: {
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
}) {
  const iconNode = icon ?? <FolderOpenIcon />;
  const sizedIcon = isValidElement<{ className?: string }>(iconNode)
    ? cloneElement(iconNode, {
        className: [iconNode.props.className, "w-10 h-10"]
          .filter(Boolean)
          .join(" "),
      })
    : iconNode;

  return (
    <div className="flex flex-col items-center gap-0 py-12 px-6 text-center bg-[oklch(from_var(--muted)_calc(l*1.01)_c_h)]">
      <span
        data-testid="ms-lib-empty-icon"
        className="inline-flex text-(--muted-foreground) w-10 h-10 mb-3"
        aria-hidden="true"
      >
        {sizedIcon}
      </span>
      <p
        className="heading mb-1 text-lg font-semibold"
        data-testid="ms-lib-empty-title"
      >
        {title}
      </p>
      <p className="ms-hint m-0 text-xs text-(--muted-foreground) leading-[1.5] m-0 text-sm">
        {description}
      </p>
    </div>
  );
}

export function LibraryPageLayout({
  titleId,
  header,
  children,
  sectionClassName,
}: {
  titleId: string;
  header: ReactNode;
  children: ReactNode;
  sectionClassName?: string;
}) {
  return (
    <>
      {header}
      <section
        aria-labelledby={titleId}
        className={["min-w-0 p-6", sectionClassName ?? ""]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </section>
    </>
  );
}

export function LibraryPageHeader({
  titleId,
  title,
  description,
  context,
  actions,
  footer,
  footerVariant,
  variant,
  stickyHeader = true,
}: {
  titleId: string;
  title: ReactNode;
  description?: ReactNode;
  context?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  footerVariant?: "tabs";
  variant?: "default" | "plain";
  stickyHeader?: boolean;
}) {
  const tabsContent =
    footerVariant === "tabs" && footer != null ? footer : undefined;

  return (
    <div
      className={[
        stickyHeader ? "sticky top-0 z-20 bg-(--card)" : "",
        description != null && variant !== "plain"
          ? "border-b border-border"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="ms-lib-page-header-row"
    >
      {context ? (
        <div
          className="min-w-0 bg-(--card) px-6 pt-5"
          data-testid="ms-lib-page-header-context"
        >
          {context}
        </div>
      ) : null}
      <PageHeader
        className={[
          "ms-lib-page-header flex flex-col gap-2 px-6 pb-4",
          context ? "pt-0" : "pt-5",
          description != null ? "border-b-0 pb-0" : "",
          footerVariant === "tabs" ? "has-tabs pb-0" : "",
          variant === "plain" ? "is-plain border-0 bg-(--background)" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        title={
          <span
            id={titleId}
            className="block"
            data-testid="ms-lib-page-header-copy"
          >
            {title}
          </span>
        }
        toolbar={
          actions ? (
            <div
              className="inline-flex items-center justify-end gap-2 shrink-0"
              data-testid="ms-lib-page-header-actions"
            >
              {actions}
            </div>
          ) : undefined
        }
        children={tabsContent}
      />
      {description != null ? (
        <div className="px-6 pb-4" data-testid="ms-lib-page-header-description">
          {description}
        </div>
      ) : null}
      {footer != null && footerVariant !== "tabs" ? (
        <div className="ms-lib-page-header-footer min-w-0">{footer}</div>
      ) : null}
    </div>
  );
}
