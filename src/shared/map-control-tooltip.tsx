import type { ReactElement, ReactNode } from 'react'
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger
} from 'skytrack-ui/tooltip'

export default function MapControlTooltip({ label, trigger, children }: { label: string; trigger: ReactElement; children?: ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={trigger}>{children}</TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side='left' sideOffset={8}>
            <TooltipPopup><TooltipArrow />{label}</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}
