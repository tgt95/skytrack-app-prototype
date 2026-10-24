import type { MouseEvent, ReactNode } from 'react'
import { DotsThreeIcon, FolderOpenIcon, StarIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuPortal,
  ContextMenuPositioner,
  ContextMenuSeparator,
  ContextMenuTrigger
} from 'skytrack-ui/context-menu'
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSeparator,
  MenuTrigger
} from 'skytrack-ui/menu'
import { SkyTooltip } from '../../shared/sky-tooltip'

export type LibraryCardAction = {
  id: string
  label: string
  onSelect: () => void
  group: 'primary' | 'common' | 'destructive'
  destructive?: boolean
}

function renderLibraryCardActions(actions: LibraryCardAction[], contextMenu = false) {
  return actions.flatMap((action, index) => {
    const previousAction = actions[index - 1]
    const separator = previousAction && previousAction.group !== action.group
      ? contextMenu
        ? <ContextMenuSeparator key={`separator-${action.id}`} />
        : <MenuSeparator key={`separator-${action.id}`} />
      : null
    const item = contextMenu ? (
      <ContextMenuItem key={action.id} variant={action.destructive ? 'destructive' : 'default'} onClick={action.onSelect}>
        {action.label}
      </ContextMenuItem>
    ) : (
      <MenuItem key={action.id} variant={action.destructive ? 'destructive' : 'default'} onClick={action.onSelect}>
        {action.label}
      </MenuItem>
    )
    return separator ? [separator, item] : [item]
  })
}

export function LibraryCardFrame({
  label,
  className,
  children,
  actions,
  testId,
  starred,
  onToggleStar,
  onOpen
}: {
  label: string
  className?: string
  children: ReactNode
  actions: LibraryCardAction[]
  testId?: string
  starred?: boolean
  onToggleStar?: () => void
  onOpen?: () => void
}) {
  const cardClassName = ['ms-lib-card', className].filter(Boolean).join(' ')
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (!onOpen) return
    const target = event.target as Element
    if (target.closest('button, a, input, textarea, select, [role="button"]')) return
    onOpen()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<article className={cardClassName} aria-label={label} onClick={handleCardClick} />}>
        <span className='ms-lib-card-overlay-actions' onClick={(event) => event.stopPropagation()}>
          {onToggleStar ? (
            <SkyTooltip><Button
              type='button'
              variant='outline'
              size='icon-sm'
              data-testid={testId ? `${testId}-star` : undefined}
              aria-label={`${starred ? 'Unstar' : 'Star'} ${label}`}
              aria-pressed={starred}
              onClick={onToggleStar}
            >
              <StarIcon aria-hidden='true' weight={starred ? 'fill' : 'regular'} />
            </Button></SkyTooltip>
          ) : null}
          {actions.length > 0 ? (
            <Menu>
              <SkyTooltip><MenuTrigger
                aria-label={`More actions for ${label}`}
                data-testid={testId ? `${testId}-more` : undefined}
                render={<Button type='button' variant='outline' size='icon-sm' />}
              >
                <DotsThreeIcon aria-hidden='true' />
              </MenuTrigger></SkyTooltip>
              <MenuPortal>
                <MenuPositioner side='bottom' align='end' sideOffset={4}>
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
  )
}

export function LibraryEmptyState({
  title,
  description,
  icon
}: {
  title: ReactNode
  description: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className='ms-lib-empty'>
      <span className='ms-lib-empty-icon' aria-hidden='true'>
        {icon ?? <FolderOpenIcon />}
      </span>
      <p className='ms-lib-empty-title'>{title}</p>
      <p className='ms-hint text-base'>{description}</p>
    </div>
  )
}

export function LibraryPageHeader({
  titleId,
  title,
  description,
  context,
  actions,
  footer,
  footerVariant,
  variant
}: {
  titleId: string
  title: ReactNode
  description?: ReactNode
  context?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  footerVariant?: 'tabs'
  variant?: 'default' | 'plain'
}) {
  const className = [
    'ms-lib-page-header',
    footerVariant === 'tabs' ? 'has-tabs' : '',
    variant === 'plain' ? 'is-plain' : ''
  ].filter(Boolean).join(' ')

  return (
    <header className={className}>
      {context ? <div className='ms-lib-page-header-context'>{context}</div> : null}
      <div className='ms-lib-page-header-row'>
        <div className='ms-lib-page-header-copy'>
          <h1 id={titleId}>{title}</h1>
          {description ? <div className='ms-lib-page-header-description'>{description}</div> : null}
        </div>
        {actions ? <div className='ms-lib-page-header-actions'>{actions}</div> : null}
      </div>
      {footer ? <div className='ms-lib-page-header-footer'>{footer}</div> : null}
    </header>
  )
}
