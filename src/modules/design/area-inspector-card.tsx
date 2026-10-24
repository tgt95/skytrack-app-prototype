import { CaretDownIcon, CaretUpIcon, DotsThreeIcon, GearIcon, GitMergeIcon, HandIcon, RulerIcon } from '@phosphor-icons/react'
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionTrigger } from 'skytrack-ui/accordion'
import { Button } from 'skytrack-ui/button'
import { Menu, MenuItem, MenuPopup, MenuPortal, MenuPositioner, MenuSeparator, MenuTrigger } from 'skytrack-ui/menu'
import { NumberField, NumberFieldInput } from 'skytrack-ui/number-field'
import { Switch, SwitchThumb } from 'skytrack-ui/switch'
import { SkyTooltip } from '../../shared/sky-tooltip'
import { AreaIcon } from '../../shared/icons'
import { getAreaScanSpacingM, dist3, type MissionArea, type ReconFlightSettings, type StudioMission } from '../../domain/mission-model'
import type { DerivedTransfer } from '../../domain/transfer-planner'
import { ReconCaptureSummary } from './reconnaissance-inspector'
import { SequenceActionBadge } from './sequence-controls'
import SliderField from './slider-field'
import { EndMissionControl, TransferRow } from './sequence-transfer'

type Waypoint = StudioMission['waypoints'][number]

export interface AreaInspectorCardProps {
  area: MissionArea
  mission: StudioMission
  worldType: '2D' | '3D'
  recon: ReconFlightSettings
  draft: MissionArea
  editing: boolean
  collapsed: boolean
  isFinalSequenceItem: boolean
  transfer?: DerivedTransfer
  onEdit: () => void
  onDelete: () => void
  onToggleCollapsed: () => void
  onToggleRecon: () => void
  onOpenRecon: () => void
  onUpdateMission: (next: StudioMission, label?: string) => void
  onSetActionPitch: (wpId: string, actionId: string, pitch: number) => void
  onPreviewDraft: (nextDraft: MissionArea) => void
  onCancelEdit: () => void
  onCommitEdit: (draft: MissionArea) => void
}

function polygonArea(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0
  let area = 0
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length
    area += points[index].x * points[next].y - points[next].x * points[index].y
  }
  return Math.abs(area) / 2
}

export default function AreaInspectorCard({
  area, mission, worldType, recon, draft, editing, collapsed,
  isFinalSequenceItem, transfer, onEdit, onDelete, onToggleCollapsed,
  onToggleRecon, onOpenRecon, onUpdateMission, onSetActionPitch,
  onPreviewDraft, onCancelEdit, onCommitEdit
}: AreaInspectorCardProps) {
  const areaM2 = Math.round(polygonArea(area.points))
  const waypoints: Waypoint[] = mission.waypoints.filter((waypoint) => waypoint.generatedByArea === area.id)
  const actionCount = waypoints.reduce((sum, waypoint) => sum + waypoint.actions.length, 0)
  const spacingM = getAreaScanSpacingM(area)
  const spacingLabel = area.reconnaissance?.enabled ? spacingM.toFixed(1) : String(spacingM)
  const pathLength = waypoints.slice(1).reduce((sum, waypoint, index) => sum + dist3(waypoints[index], waypoint), 0)
  const photoCount = waypoints.reduce((count, waypoint) => count + waypoint.actions.filter((action) => action.kind === 'photo').length, 0)

  const previewArea = (next: MissionArea) => onPreviewDraft(next)

  return (
    <section className={`ms-card ms-object-block${editing ? ' is-editing' : ''}`} aria-label={area.label}>
      <div className='ms-route-head'>
        <div className='ms-route-title-group'><AreaIcon aria-hidden='true' className='ms-route-icon' /><span className='ms-route-name'>{area.label}</span></div>
        <span className='ms-route-stats'>
          <SkyTooltip><span className='ms-stat' aria-label={areaM2 > 0 ? `${areaM2} square meters` : `${area.points.length} outline points`}><RulerIcon aria-hidden='true' />{areaM2 > 0 ? `${areaM2} m²` : `${area.points.length} pts`}</span></SkyTooltip>
          <span aria-hidden='true'>·</span>
          <SkyTooltip><span className='ms-stat' aria-label={`${waypoints.length} generated waypoints in ${area.label}`}><GitMergeIcon aria-hidden='true' />{waypoints.length}</span></SkyTooltip>
          <span aria-hidden='true'>·</span>
          <SkyTooltip><span className='ms-stat' aria-label={`${actionCount} generated drone actions in ${area.label}`}><HandIcon aria-hidden='true' />{actionCount}</span></SkyTooltip>
        </span>
        <div className='ms-route-actions'>
          <Menu><SkyTooltip><MenuTrigger aria-label={`More options for ${area.label}`} className='border-0 bg-transparent p-0' render={<Button variant='ghost' size='icon-sm' />}><DotsThreeIcon aria-hidden='true' /></MenuTrigger></SkyTooltip>
            <MenuPortal><MenuPositioner side='bottom' align='end' sideOffset={4}><MenuPopup>
              <MenuItem onClick={onEdit}>Edit area</MenuItem>
              <MenuSeparator />
              <MenuItem onClick={onDelete}>Delete area</MenuItem>
            </MenuPopup></MenuPositioner></MenuPortal>
          </Menu>
          <SkyTooltip><Button variant='ghost' size='icon-sm' aria-expanded={!collapsed} aria-label={collapsed ? `Expand ${area.label}` : `Collapse ${area.label}`} onClick={onToggleCollapsed}>
            {collapsed ? <CaretDownIcon aria-hidden='true' /> : <CaretUpIcon aria-hidden='true' />}
          </Button></SkyTooltip>
        </div>
      </div>
      {worldType === '2D' ? <div className='ms-recon-control-group'><div className='ms-recon-control-row'>
        <span>Reconnaissance flight</span><Switch checked={recon.enabled} size='sm' aria-label={`${area.label} reconnaissance flight`} onCheckedChange={onToggleRecon}><SwitchThumb size='sm' /></Switch>
        <SkyTooltip><Button variant='ghost' size='icon-sm' aria-label={`Reconnaissance settings for ${area.label}`} onClick={onOpenRecon}><GearIcon aria-hidden='true' /></Button></SkyTooltip>
      </div></div> : null}
      {worldType === '2D' && recon.enabled ? <>
        <ReconCaptureSummary waypoints={waypoints} settings={recon} pathLength={pathLength} altitudeAgl />
        <Accordion multiple className='ms-area-capture-list' aria-label={`${area.label} waypoint camera settings`}>
          <AccordionItem value='camera-settings' className='border-b-0'>
            <AccordionHeader><AccordionTrigger variant='compact'>Camera settings by waypoint ({photoCount})</AccordionTrigger></AccordionHeader>
            <AccordionPanel><ol className='ms-area-capture-rows ms-seq-list'>
              {waypoints.flatMap((waypoint) => waypoint.actions.filter((action) => action.kind === 'photo').map((action) => <li className='ms-seq-action-row ms-area-capture-row' key={action.id}>
                <span className='ms-seq-badge' aria-label={`Waypoint ${waypoint.seq}`}>{waypoint.seq}</span>
                <SequenceActionBadge kind='photo' />
                <span className='ms-action-label'>Photo capture</span>
                <label className='ms-action-camera-angle'><span>Pitch</span>
                  <NumberField value={action.gimbalPitchDeg ?? recon.gimbalPitchDeg} min={-90} max={0} step={1} onValueChange={(value) => { if (typeof value === 'number' && Number.isFinite(value)) onSetActionPitch(waypoint.id, action.id, value) }}>
                    <NumberFieldInput className='text-right' aria-label={`Pitch at waypoint ${waypoint.seq}`} />
                  </NumberField><span>°</span>
                </label>
              </li>))}
            </ol></AccordionPanel>
          </AccordionItem>
        </Accordion>
      </> : null}
      {!collapsed ? <>
        {editing ? <form className='ms-zone-settings' aria-label={`${area.label} scan settings`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancelEdit() }
            else if (event.key === 'Enter') {
              event.stopPropagation()
              if (event.target instanceof HTMLElement && event.target.getAttribute('role') === 'slider') { event.preventDefault(); event.currentTarget.requestSubmit() }
            }
          }}
          onSubmit={(event) => { event.preventDefault(); onCommitEdit(draft) }}>
          {draft.reconnaissance?.enabled ? <p className='ms-hint'>Lane spacing follows Side overlap ({getAreaScanSpacingM(draft).toFixed(1)} m) while Recon is on. Turn Recon off to edit manual line spacing.</p> :
            <SliderField label='Line spacing (m)' value={draft.lineSpacingM ?? 6} min={0.25} max={20} step={0.25} unit='m' onChange={(value) => previewArea({ ...draft, lineSpacingM: value })} />}
          <SliderField label='Orientation (°)' value={draft.orientationDeg ?? 0} min={-180} max={180} step={1} unit='°' onChange={(value) => previewArea({ ...draft, orientationDeg: value })} />
          <SliderField label='Scan padding (m)' value={draft.paddingM ?? 0} min={0} max={20} step={0.5} unit='m' onChange={(value) => previewArea({ ...draft, paddingM: value })} />
          <div className='ms-btnrow'><Button type='button' size='sm' variant='outline' onClick={onCancelEdit}>Cancel</Button><Button type='submit' size='sm' variant='default'>Commit area</Button></div>
        </form> : <p className='ms-hint pt-0!'>{(area.scanLines?.length ?? 0)} scan lanes · {spacingLabel} m spacing · {area.orientationDeg ?? 0}°</p>}
        <TransferRow transfer={transfer} />
        {isFinalSequenceItem && !transfer ? <EndMissionControl mission={mission} onUpdateMission={onUpdateMission} /> : null}
      </> : null}
    </section>
  )
}
