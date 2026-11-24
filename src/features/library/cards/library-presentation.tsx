import {
  type MouseEvent,
  type ReactNode,
} from "react";
import { DotsThreeIcon, StarIcon } from "@phosphor-icons/react";
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
  const isInteractive = Boolean(onOpen || onToggleStar || actions.length > 0);
  const cardClassName = [
    "ms-lib-card relative flex flex-col w-full p-0 border border-border rounded-(--radius) bg-card text-foreground text-left overflow-hidden",
    isInteractive
      ? "cursor-pointer hover:border-(--primary) focus-visible:outline-2 focus-visible:outline-(--sidebar-ring) focus-visible:outline-offset-1"
      : "cursor-default",
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

  if (!isInteractive) {
    return (
      <article className={cardClassName} aria-label={label}>
        {children}
      </article>
    );
  }

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
                className="bg-(--card) dark:bg-(--card) dark:hover:bg-(--card)"
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="bg-(--card) dark:bg-(--card) dark:hover:bg-(--card)"
                    />
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
