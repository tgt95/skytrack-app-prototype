import { memo } from 'react'
import {
  AirplaneTakeoffIcon,
  ChartPieIcon,
  DroneIcon,
  HandIcon,
  ListChecksIcon,
  PathIcon
} from '@phosphor-icons/react'
import { Tabs, TabsIndicator, TabsList, TabsTab } from 'skytrack-ui/tabs'
import { Toolbar, ToolbarGroup } from 'skytrack-ui/toolbar'
import { AreaIcon, AvoidZoneIcon } from '../../shared/icons'
import { ToolButton } from '../design/design-controls'
import type { SceneTool } from '../../domain/mission-model'

export type AppTab = 'plan' | 'fly' | 'report'

const APP_TABS: { id: AppTab; label: string; hint: string }[] = [
  { id: 'plan', label: 'Plan', hint: 'Mission planner' },
  { id: 'fly', label: 'Fly', hint: 'Placeholder' },
  { id: 'report', label: 'Report', hint: 'Placeholder' }
]

const APP_TAB_ICONS = {
  plan: ListChecksIcon,
  fly: DroneIcon,
  report: ChartPieIcon
} as const

interface StudioLeftRailProps {
  appTab: AppTab
  orientation: 'horizontal' | 'vertical'
  stageIsDesign: boolean
  tool: SceneTool
  onAppTabChange: (tab: AppTab) => void
  onToolChange: (tool: SceneTool) => void
  onClearPending: () => void
  onClearDraftCursor: () => void
  onClearDraftClosure: () => void
  onSetPolygon: () => void
  onAnnounce: (message: string) => void
}

function StudioLeftRail({
  appTab,
  orientation,
  stageIsDesign,
  tool,
  onAppTabChange,
  onToolChange,
  onClearPending,
  onClearDraftCursor,
  onClearDraftClosure,
  onSetPolygon,
  onAnnounce
}: StudioLeftRailProps) {
  const resetDraft = () => {
    onClearPending()
    onClearDraftCursor()
    onClearDraftClosure()
  }

  return (
    <aside className='ms-rail' aria-label='Mission navigation and tools'>
      <Tabs value={appTab} onValueChange={(value: unknown) => {
        const next = String(value) as AppTab
        if (next !== appTab) onAppTabChange(next)
      }} orientation={orientation}>
        <TabsList className='ms-apptabs' aria-label='Mission workspace'>
          {APP_TABS.map((tab) => {
            const TabIcon = APP_TAB_ICONS[tab.id]
            const selected = appTab === tab.id
            return (
              <TabsTab
                key={tab.id}
                value={tab.id}
                id={`ms-apptab-${tab.id}`}
                aria-label={`${tab.label} — ${tab.hint}`}
                data-testid={`ms-apptab-${tab.id}`}
                variant='standard'
                className='ms-apptab'
              >
                <TabIcon weight={selected ? 'fill' : 'regular'} aria-hidden='true' />
                <span className='ms-apptab-label'>{tab.label}</span>
              </TabsTab>
            )
          })}
          <TabsIndicator variant='underline' />
        </TabsList>
      </Tabs>
      <Toolbar orientation='vertical' aria-label='Mission tools' className='ms-rail-bottom'>
        <ToolbarGroup aria-label='Draw tools' className='ms-rail-group'>
          <ToolButton label='Cursor' hint='Select · Esc' active={tool === 'select'} testid='ms-tool-select'
            onClick={() => { resetDraft(); onToolChange('select') }} disabled={!stageIsDesign}>
            <HandIcon weight={tool === 'select' ? 'fill' : 'regular'} aria-hidden='true' />
          </ToolButton>
          <ToolButton label='Home point' hint='H · Click map to place drone Home' active={tool === 'home'} testid='ms-tool-home'
            onClick={() => { resetDraft(); onToolChange('home'); onAnnounce('Click the map to place the drone Home point.') }} disabled={!stageIsDesign}>
            <AirplaneTakeoffIcon weight={tool === 'home' ? 'fill' : 'regular'} aria-hidden='true' />
          </ToolButton>
          <ToolButton label='Route' hint='R' active={tool === 'route'} testid='ms-tool-route'
            onClick={() => { resetDraft(); onToolChange('route') }} disabled={!stageIsDesign}>
            <PathIcon weight={tool === 'route' ? 'fill' : 'regular'} aria-hidden='true' />
          </ToolButton>
          <ToolButton label='Area' hint='A' active={tool === 'area'} testid='ms-tool-area'
            onClick={() => { resetDraft(); onSetPolygon(); onToolChange('area') }} disabled={!stageIsDesign}>
            <AreaIcon aria-hidden='true' />
          </ToolButton>
          <ToolButton label='Avoid zone' hint='N' active={tool === 'avoid'} testid='ms-tool-avoid'
            onClick={() => { resetDraft(); onSetPolygon(); onToolChange('avoid') }} disabled={!stageIsDesign}>
            <AvoidZoneIcon aria-hidden='true' />
          </ToolButton>
        </ToolbarGroup>
      </Toolbar>
    </aside>
  )
}

export default memo(StudioLeftRail)
