import type { ReactElement } from 'react'
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger
} from 'skytrack-ui/tooltip'

type SkyTooltipProps = {
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function SkyTooltip({ children, side = 'top' }: SkyTooltipProps) {
  const triggerProps = children.props as { 'aria-label'?: unknown; title?: unknown; disabled?: unknown }
  const label = typeof triggerProps.title === 'string'
    ? triggerProps.title
    : typeof triggerProps['aria-label'] === 'string'
      ? triggerProps['aria-label']
      : null
  if (!label) return children
  const tooltipLabel = label
    .replace(/^Reconnaissance settings\b.*/i, 'Settings')
    .replace(/^More (?:options|actions)\b.*/i, 'More options')
    .replace(/^(Collapse|Expand)\b.*/i, '$1')
    .replace(/^Reset\b.*/i, 'Reset')
    .replace(/^Back to library home\b.*/i, 'Home')
    .replace(/^Back to design\b.*/i, 'Back')
    .replace(/^Delete waypoint\b.*/i, 'Delete waypoint')
    .replace(/^Remove\b.*/i, 'Remove')
    .replace(/^(?:Drag to reorder|Reorder)\b.*/i, 'Reorder')
    .replace(/^Select waypoint\b.*/i, 'Select waypoint')
    .replace(/^Choose world and mission type\b.*/i, 'Choose world')
    .replace(/^Add drone\b.*/i, 'Add drone')
    .replace(/^(Restore|Expand) LiDAR preview\b.*/i, '$1 preview')
    .replace(/^Close\b.*/i, 'Close')
    .replace(/^AI script assistance\b.*/i, 'AI assistance')
    .replace(/^Dismiss toast\b.*/i, 'Dismiss')
    .replace(/^Toggle inspector panel\b.*/i, 'Toggle panel')
    .replace(/^Save local state\b.*/i, 'Save')
  const disabled = triggerProps.disabled === true

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={disabled ? <span className='inline-flex' tabIndex={0} /> : children}
        >
          {disabled ? children : undefined}
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side={side} sideOffset={6}>
            <TooltipPopup><TooltipArrow />{tooltipLabel}</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}
