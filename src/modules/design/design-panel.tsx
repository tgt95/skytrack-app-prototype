/* design-panel.tsx — right inspector for the Design stage: route card,
   waypoint/END sequence, zones, validation, mission props, code view. */

import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  BrainIcon,
  CameraIcon,
  CaretDownIcon,
  CaretUpIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  GearIcon,
  GitMergeIcon,
  HandIcon,
  PathIcon,
  PlusIcon,
  QuestionIcon,
  RulerIcon,
  ScanIcon,
  SparkleIcon,
  TrashIcon
} from '@phosphor-icons/react'
import { Fragment, useEffect, useState } from 'react'
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionTrigger } from 'skytrack-ui/accordion'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { Menu, MenuItem, MenuPopup, MenuPortal, MenuPositioner, MenuTrigger } from 'skytrack-ui/menu'
import { NumberField, NumberFieldInput } from 'skytrack-ui/number-field'
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue
} from 'skytrack-ui/select'
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from 'skytrack-ui/slider'
import { Switch, SwitchThumb } from 'skytrack-ui/switch'
import { Tabs, TabsIndicator, TabsList, TabsTab } from 'skytrack-ui/tabs'
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger
} from 'skytrack-ui/tooltip'
import { Toggle } from 'skytrack-ui/toggle'
import { ToggleGroup } from 'skytrack-ui/toggle-group'
import {
  actionLabel,
  dist3,
  DEFAULT_RECON_FLIGHT_SETTINGS,
  getAreaPhotoSpacingM,
  getAreaScanSpacingM,
  getMockReconGsdCmPerPx,
  getMissionSequence,
  getMissionRoutes,
  SAFETY_OPTIONS,
  safetyModeOf,
  type CameraActionKind,
  type MissionArea,
  type ReconFlightSettings,
  type AvoidZone,
  type SafetyMode,
  type SceneSelection,
  type StudioMission,
  type ValidationIssue,
  type Waypoint,
  uid
} from '../../domain/mission-model'
import type { DerivedTransfer } from '../../domain/transfer-planner'
import { AreaIcon, AvoidZoneIcon } from '../../shared/icons'
import MissionPreview from '../simulation/mission-preview'
import { ReconnaissanceSettingsForm } from './reconnaissance-settings-form'
import { PythonEditor } from './python-editor'

const ACTION_OPTIONS: { value: CameraActionKind; label: string }[] = [
  { value: 'photo', label: 'Photo capture' },
  { value: 'video-start', label: 'Camera Start recording' },
  { value: 'video-stop', label: 'Camera Stop recording' },
  { value: 'lidar-scan', label: 'LiDAR scan' }
]

function polygonArea(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area) / 2
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div className='ms-slider-field'>
      <div className='ms-slider-label'>{label}</div>
      <div className='ms-slider-row'>
        <div className='ms-slider-track-wrap'>
          <Slider
            value={value}
            min={min}
            max={max}
            step={step}
            onValueChange={(v) => {
              const first = typeof v === 'number' ? v : v[0]
              if (typeof first === 'number') onChange(first)
            }}
          >
            <SliderControl>
              <SliderTrack>
                <SliderIndicator />
                <SliderThumb aria-label={label} />
              </SliderTrack>
            </SliderControl>
          </Slider>
        </div>
        <div className='ms-slider-val-box'>
          <NumberField
            value={value}
            min={min}
            max={max}
            step={step}
            className='w-full'
            onValueChange={(next) => {
              if (typeof next === 'number' && Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)))
            }}
          >
            <NumberFieldInput aria-label={`${label} ${unit}`} />
          </NumberField>
        </div>
      </div>
    </div>
  )
}

export function ZoneDraftPanel(props: {
  className?: string
  kind: 'area' | 'avoid'
  shape: 'polygon' | 'cylinder'
  pointCount: number
  canCommit: boolean
  area: { lineSpacingM: number; orientationDeg: number; paddingM: number }
  avoid: { type: 'obstacle' | 'privacy'; heightM: number; clearanceM: number }
  onAreaChange: (next: ZoneDraftPanelProps['area']) => void
  onAvoidChange: (next: ZoneDraftPanelProps['avoid']) => void
  onCommit: () => void
  onCancel: () => void
}) {
  const { className = '', kind, shape, pointCount, canCommit, area, avoid, onAreaChange, onAvoidChange, onCommit, onCancel } = props
  return (
    <section className={`ms-card ms-zone-draft-panel ${className}`} aria-label={`${kind === 'area' ? 'Area' : 'Avoid zone'} drawing settings`} data-testid='ms-zone-draft-panel'>
      <div className='ms-route-head'>
        <div className='ms-route-title-group'>
          {kind === 'area' ? <AreaIcon aria-hidden='true' className='ms-route-icon' /> : <AvoidZoneIcon aria-hidden='true' className='ms-route-icon' />}
          <span className='ms-route-name'>{kind === 'area' ? 'Area draft' : 'Avoid zone draft'}</span>
        </div>
      </div>
      <div className='ms-zone-settings'>
        {kind === 'area' ? (
          <>
            <SliderField label='Line spacing (m)' value={area.lineSpacingM} min={0.25} max={20} step={0.25} unit='m' onChange={(v) => onAreaChange({ ...area, lineSpacingM: v })} />
            <SliderField label='Orientation (°)' value={area.orientationDeg} min={-180} max={180} step={1} unit='°' onChange={(v) => onAreaChange({ ...area, orientationDeg: v })} />
            <SliderField label='Scan padding (m)' value={area.paddingM} min={0} max={20} step={0.5} unit='m' onChange={(v) => onAreaChange({ ...area, paddingM: v })} />
            <p className='ms-hint' aria-live='polite'>{pointCount} outline point{pointCount === 1 ? '' : 's'} · scan preview updates as settings change.</p>
          </>
        ) : (
          <>
            <p className='ms-hint'>Choose whether this is a physical obstacle or a people/privacy exclusion zone.</p>
            <ToggleGroup
              value={[avoid.type]}
              variant='segmented'
              size='xs'
              aria-label='Avoid zone type'
              className='ms-avoid-type-toggle'
              onValueChange={(values) => {
                const value = values[0]
                if (value === 'obstacle' || value === 'privacy') onAvoidChange({ ...avoid, type: value })
              }}
            >
              <Toggle value='obstacle'>Obstacle</Toggle>
              <Toggle value='privacy'>People / Privacy</Toggle>
            </ToggleGroup>
            <SliderField label='Zone height (m)' value={avoid.heightM} min={1} max={150} step={0.5} unit='m' onChange={(v) => onAvoidChange({ ...avoid, heightM: Math.max(1, v) })} />
            <SliderField label='Flight clearance (m)' value={avoid.clearanceM} min={0} max={50} step={0.5} unit='m' onChange={(v) => onAvoidChange({ ...avoid, clearanceM: Math.max(0, v) })} />
            <p className='ms-hint' aria-live='polite'>{pointCount} outline point{pointCount === 1 ? '' : 's'} · volume preview updates as settings change.</p>
          </>
        )}
        <div className='ms-btnrow'>
          <Button size='sm' variant='outline' onClick={onCancel}>Cancel</Button>
          <Button size='sm' variant='default' onClick={onCommit} disabled={!canCommit}>
            {shape === 'cylinder' ? 'Confirm cylinder' : `Commit ${kind === 'area' ? 'area' : 'avoid zone'}`}
          </Button>
        </div>
      </div>
    </section>
  )
}

type ZoneDraftPanelProps = {
  area: { lineSpacingM: number; orientationDeg: number; paddingM: number }
  avoid: { type: 'obstacle' | 'privacy'; heightM: number; clearanceM: number }
}

function ActionInsertAffordance(props: {
  wpId: string
  actionIndex: number
  wpSeq: number
  onInsertAction: (wpId: string, actionIndex: number, kind: CameraActionKind) => void
}) {
  const { wpId, actionIndex, wpSeq, onInsertAction } = props
  return (
    <li className='ms-insert-action-zone' data-testid={`ms-insert-action-${wpId}-${actionIndex}`}>
      <div className='ms-insert-action-line' aria-hidden='true' />
      <Menu>
        <MenuTrigger
          className='ms-insert-action-btn'
          aria-label={`Insert drone action at waypoint ${wpSeq} position ${actionIndex + 1}`}
        >
          <PlusIcon aria-hidden='true' />
        </MenuTrigger>
        <MenuPortal>
          <MenuPositioner side='bottom' align='center' sideOffset={4}>
            <MenuPopup className='ms-insert-action-menu'>
              {ACTION_OPTIONS.map((option) => (
                <MenuItem
                  key={option.value}
                  onClick={() => onInsertAction(wpId, actionIndex, option.value)}
                >
                  <span className='ms-action-tag-mini'>
                    {option.value === 'lidar-scan' ? <ScanIcon aria-hidden='true' /> : <CameraIcon aria-hidden='true' />}
                  </span>
                  <span>{option.label}</span>
                </MenuItem>
              ))}
            </MenuPopup>
          </MenuPositioner>
        </MenuPortal>
      </Menu>
    </li>
  )
}

function SequenceActionRow(props: {
  action: { id: string; kind: CameraActionKind; label: string; gimbalPitchDeg?: number }
  wpId: string
  wpSeq: number
  inheritedPitch: number
  onDeleteAction: (wpId: string, actionId: string) => void
  onSetPitch: (wpId: string, actionId: string, pitch: number) => void
}) {
  const { action, wpId, wpSeq, inheritedPitch, onDeleteAction, onSetPitch } = props
  const isLidar = action.kind === 'lidar-scan'
  return (
    <li className='ms-seq-action-row' data-testid={`ms-action-row-${action.id}`}>
      <span className={`ms-action-tag${isLidar ? ' is-lidar' : ' is-camera'}`}>{isLidar ? <ScanIcon aria-hidden='true' /> : <CameraIcon aria-hidden='true' />}{isLidar ? ' LiDAR' : ' Camera'}</span>
      <span className='ms-action-label'>{action.label}</span>
      {action.kind === 'photo' ? (
        <label className='ms-action-camera-angle'>
          <span>Gimbal pitch</span>
          <NumberField
            value={action.gimbalPitchDeg ?? inheritedPitch}
            min={-90}
            max={0}
            step={1}
            onValueChange={(value) => {
              if (typeof value === 'number' && Number.isFinite(value)) onSetPitch(wpId, action.id, value)
            }}
          >
            <NumberFieldInput aria-label={`Gimbal pitch at waypoint ${wpSeq}`} />
          </NumberField>
          <span>°</span>
        </label>
      ) : null}
      <Button
        size='icon-sm'
        variant='ghost'
        aria-label={`Remove ${action.label} from waypoint ${wpSeq}`}
        onClick={() => onDeleteAction(wpId, action.id)}
      >
        <TrashIcon aria-hidden='true' />
      </Button>
    </li>
  )
}

/* Compact direct-entry numeric field for the waypoint sequence rows.
   The stepper NumberField (≈136px per axis) cannot fit three-across inside
   the 310–360px inspector, so these rows use a small native number input with
   the same labels, min/max/step and keyboard number editing (typing, spinner,
   ArrowUp/ArrowDown). Single-field controls (target speed, zone settings)
   keep the stepper. Values commit on change, clamped to range. */
function CompactAxisField({
  label,
  short,
  value,
  min,
  max,
  step,
  inputSize = 'compact',
  onChange
}: {
  label: string
  short: string
  value: number
  min: number
  max: number
  step: number
  inputSize?: 'compact' | 'xs'
  onChange: (v: number) => void
}) {
  const [text, setText] = useState<string | null>(null)
  // Render-phase sync: an external value change (undo, reorder, reset) drops
  // any in-progress text so the field never shows a stale edit.
  const [syncedValue, setSyncedValue] = useState(value)
  if (syncedValue !== value) {
    setSyncedValue(value)
    setText(null)
  }
  const display = text ?? String(value)
  const commit = (v: number) => {
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)))
  }
  return (
    <label className='ms-axis-compact'>
      <span className='ms-axis' aria-hidden='true'>
        {short}
      </span>
      <NumberField
        value={value}
        min={min}
        max={max}
        step={step}
        className='ms-axis-number-field'
        onValueChange={(next) => {
          if (typeof next === 'number' && Number.isFinite(next)) {
            setText(String(next))
            commit(next)
          }
        }}
      >
        <NumberFieldInput
          size={inputSize}
          aria-label={label}
          value={display}
          onChange={(event) => {
            setText(event.target.value)
            commit(Number.parseFloat(event.currentTarget.value))
          }}
          onBlur={(event) => {
            setText(null)
            const v = Number.parseFloat(event.currentTarget.value)
            if (Number.isFinite(v)) {
              const clamped = Math.min(max, Math.max(min, v))
              if (clamped !== value) onChange(clamped)
            }
          }}
        />
      </NumberField>
    </label>
  )
}

export interface DesignPanelProps {
  mission: StudioMission
  worldType: '2D' | '3D'
  transfers: DerivedTransfer[]
  issues: ValidationIssue[]
  selection: SceneSelection | null
  codeView: boolean
  codeDraft: string
  codeLang: 'python' | 'json'
  jsonDraft: string
  jsonError: string | null
  onCodeViewChange: (code: boolean) => void
  onCodeDraftChange: (text: string) => void
  onCodeLangChange: (lang: 'python' | 'json') => void
  onJsonDraftChange: (text: string) => void
  onApplyJson: () => void
  onExportJson: () => void
  onSelect: (sel: SceneSelection | null) => void
  onUpdateMission: (next: StudioMission, label?: string) => void
  onPreviewMission: (next: StudioMission) => void
  onCommitPreview: (next: StudioMission, label?: string) => void
  onCancelPreview: () => void
  onDetailEditStateChange: (active: boolean) => void
  onAddWaypoint: (routeId?: string) => void
  onDeleteRoute: (routeId: string) => void
  onDeleteWaypoint: (id: string) => void
  onMoveWaypoint: (id: string, dir: -1 | 1) => void
  onReorderWaypoint: (id: string, toIndex: number) => void
  onInsertActionAt: (wpId: string, actionIndex: number, kind: CameraActionKind) => void
  onDeleteAction: (wpId: string, actionId: string) => void
  onAddZone: (kind: 'area' | 'avoid') => void
  onDeleteZone: (kind: 'area' | 'avoid', id: string) => void
  onRenameZone: (kind: 'area' | 'avoid', id: string, label: string) => void
  onCollapsePane: () => void
  onAnnounce: (text: string) => void
  previewPositionRef: { current: { x: number; y: number; z: number } | null }
  previewCaptureRef: { current: string | null }
}

/* Waypoint sequence row: one-line compact X/Y/Z direct-entry fields, pointer
   + keyboard drag reorder via the leading handle, and a trailing More menu
   whose only item is Delete. Keyboard reorder is preview-only until drop:
   arrow moves only change the rendered row order held by DesignPanel (no
   mission commit, no undo/redo history change); Space drops the preview as a
   single undoable reorder commit and Escape discards the preview without
   touching the mission or its history. Pointer drag commits once per drop.
   Reorder preserves waypoint identity and goes through the existing undo/redo
   history in the parent only on drop. */
function WaypointRow(props: {
  wp: Waypoint
  index: number
  total: number
  grabbed: boolean
  mission: StudioMission
  selected: boolean
  onSelect: (sel: SceneSelection | null) => void
  onUpdateMission: (next: StudioMission, label?: string) => void
  onPickUpWaypoint: (id: string) => void
  onPreviewMoveWaypoint: (id: string, dir: -1 | 1) => void
  onDropPreviewWaypoint: (id: string) => void
  onCancelPreviewWaypoint: (id: string) => void
  onReorderWaypoint: (id: string, toIndex: number) => void
  onDeleteWaypoint: (id: string) => void
  onAnnounce: (text: string) => void
}) {
  const {
    wp, index, total, grabbed, mission, selected,
    onSelect, onUpdateMission,
    onPickUpWaypoint, onPreviewMoveWaypoint, onDropPreviewWaypoint, onCancelPreviewWaypoint,
    onReorderWaypoint,
    onDeleteWaypoint
  } = props
  const [dropTarget, setDropTarget] = useState(false)

  const patchWaypoint = (patch: { x?: number; y?: number; z?: number }) => {
    onUpdateMission({
      ...mission,
      waypoints: mission.waypoints.map((w) => (w.id === wp.id ? { ...w, ...patch } : w))
    })
  }

  const onHandleKeyDown = (event: React.KeyboardEvent) => {
    // Handled here: stop propagation so the global Esc/tool shortcuts in
    // index.tsx do not double-handle the same keypress (e.g. clearing the
    // selection or overwriting the reorder announcement).
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      event.stopPropagation()
      if (grabbed) onDropPreviewWaypoint(wp.id)
      else onPickUpWaypoint(wp.id)
      return
    }
    if (!grabbed) return
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      if (index > 0) onPreviewMoveWaypoint(wp.id, -1)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      if (index < total - 1) onPreviewMoveWaypoint(wp.id, 1)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onCancelPreviewWaypoint(wp.id)
    }
  }

  return (
    <li
      className={`ms-seq-row${selected ? ' is-selected' : ''}${dropTarget ? ' is-drop-target' : ''}${grabbed ? ' is-grabbed' : ''}`}
      data-testid={`ms-wp-${wp.seq}`}
      data-wp-id={wp.id}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDropTarget(true)
      }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDropTarget(false)
        const id = event.dataTransfer.getData('text/plain')
        if (id) onReorderWaypoint(id, index)
      }}
    >
      <Button
        type='button'
        variant='ghost'
        size='icon-xs'
        className='ms-drag-handle'
        draggable
        aria-label={grabbed
          ? `Reorder waypoint ${wp.seq}, grabbed. Arrow keys move, Space drops, Escape cancels.`
          : `Reorder waypoint ${wp.seq}. Press Space to pick up.`}
        aria-grabbed={grabbed}
        data-testid={`ms-wp-handle-${wp.seq}`}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', wp.id)
          event.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={() => setDropTarget(false)}
        onKeyDown={onHandleKeyDown}
      >
        <DotsSixVerticalIcon aria-hidden='true' />
      </Button>
      <button
        type='button'
        className='ms-seq-badge is-wp'
        aria-pressed={selected}
        aria-label={`Select waypoint ${wp.seq}`}
        onClick={() => onSelect(selected ? null : { kind: 'waypoint', id: wp.id })}
      >
        {wp.seq}
      </button>
      <div className='ms-seq-fields'>
        <CompactAxisField label={`Waypoint ${wp.seq} X`} short='X' value={wp.x} min={-500} max={500} step={0.5}
          onChange={(v) => patchWaypoint({ x: v })} />
        <CompactAxisField label={`Waypoint ${wp.seq} Y`} short='Y' value={wp.y} min={-500} max={500} step={0.5}
          onChange={(v) => patchWaypoint({ y: v })} />
        <CompactAxisField label={`Waypoint ${wp.seq} altitude`} short='Z' value={wp.z} min={0} max={150} step={0.5}
          onChange={(v) => patchWaypoint({ z: v })} />
      </div>
      <div className='ms-seq-actions'>
        <Button
          size='icon-sm'
          variant='ghost'
          aria-label={`Delete waypoint ${wp.seq}`}
          data-testid={`ms-wp-delete-${wp.seq}`}
          onClick={() => onDeleteWaypoint(wp.id)}
        >
          <TrashIcon aria-hidden='true' />
        </Button>
      </div>
    </li>
  )
}

export default function DesignPanel(props: DesignPanelProps) {
  const {
    mission,
    worldType,
    transfers,
    issues,
    selection,
    codeView,
    codeDraft,
    codeLang,
    jsonDraft,
    jsonError,
    onCodeViewChange,
    onCodeDraftChange,
    onCodeLangChange,
    onJsonDraftChange,
    onApplyJson,
    onExportJson,
    onSelect,
    onUpdateMission,
    onPreviewMission,
    onCommitPreview,
    onCancelPreview,
    onDetailEditStateChange,
    onAddWaypoint,
    onDeleteRoute,
    onDeleteWaypoint,
    onReorderWaypoint,
    onInsertActionAt,
    onDeleteAction,
    onDeleteZone,
    onAnnounce,
    previewPositionRef,
    previewCaptureRef
  } = props
  const missionSettingsTooltip = 'These settings are packaged into the mission file and sent to the drone. They govern how the drone executes the route autonomously in the field.'

  const routes = getMissionRoutes(mission)
  const missionSequence = getMissionSequence(mission)
  const isFinalSequenceItem = (type: 'route' | 'area', id: string) => {
    const last = missionSequence[missionSequence.length - 1]
    return last?.type === type && last.id === id
  }
  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')

  /* Right-pane sequence: transfers are derived, non-editable previews. Each
     Route or Area source has at most one outgoing transfer to the next active
     block, so lookup by source renders TRANS immediately after its owner. */
  const transferFrom = (fromType: 'route' | 'area', fromId: string) =>
    transfers.find((t) => t.fromType === fromType && t.fromId === fromId)
  /* Shared TRANS content; routes render it as a list item so it touches the
     sequence rows, areas render the same content as a standalone row. */
  const transferContent = (transfer: DerivedTransfer) => (
    <>
      <Badge count='TRANS' status='secondary' size='sm' />
      <span className='ms-seq-marker-label'>Go to the next {transfer.toType}</span>
      <span className='ms-seq-dist'>{transfer.distanceM.toFixed(1)} m{transfer.hasDetour ? ' · detour' : ''}</span>
      {transfer.errorMessage ? <span className='ms-issue is-warning'>{transfer.errorMessage}</span> : null}
    </>
  )
  const transferItem = (transfer: DerivedTransfer | undefined) => {
    if (!transfer) return null
    return (
      <li
        className='ms-seq-row ms-seq-trans'
        role='note'
        data-testid={`ms-trans-${transfer.id}`}
        aria-label={`Generated transfer from ${transfer.fromLabel} to ${transfer.toLabel}, ${transfer.distanceM.toFixed(1)} meters`}
      >
        {transferContent(transfer)}
      </li>
    )
  }
  const transferBox = (transfer: DerivedTransfer | undefined) => {
    if (!transfer) return null
    return (
      <div
        className='ms-seq-row ms-seq-trans'
        role='note'
        data-testid={`ms-trans-${transfer.id}`}
        aria-label={`Generated transfer from ${transfer.fromLabel} to ${transfer.toLabel}, ${transfer.distanceM.toFixed(1)} meters`}
      >
        {transferContent(transfer)}
      </div>
    )
  }
  const endMissionControl = () => (
    <div className='ms-seq-row ms-end'>
      <Badge count='END' status='outline' size='sm' className='ms-seq-static-accent' />
      <Select<string>
        items={[
          { value: 'home', label: 'Drone - Return to home' },
          { value: 'stay', label: 'Stay at last waypoint' }
        ]}
        value={mission.returnHomeOnEnd ? 'home' : 'stay'}
        onValueChange={(v: unknown) => {
          const home = String(v) !== 'stay'
          if (home === mission.returnHomeOnEnd) return
          onUpdateMission(
            { ...mission, returnHomeOnEnd: home },
            home ? 'Drone returns home on end.' : 'Drone stays at last waypoint on end.'
          )
        }}
      >
        <SelectTrigger aria-label='End of mission behavior' data-testid='ms-end-select' className='ms-end-select'>
          <SelectValue />
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner side='bottom' align='end' sideOffset={4}>
            <SelectPopup>
              <SelectList>
                <SelectItem value='home'><SelectItemIndicator /><SelectItemText>Drone - Return to home</SelectItemText></SelectItem>
                <SelectItem value='stay'><SelectItemIndicator /><SelectItemText>Stay at last waypoint</SelectItemText></SelectItem>
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </div>
  )

  /* Keyboard reorder preview: while a waypoint handle is grabbed, the rendered
     row order is held here (mission order untouched, no history change). Arrow
     keys reshuffle this preview; Space drops it as one reorder commit and
     Escape discards it. Any mission change (pointer edit, undo, JSON apply)
     invalidates an in-flight preview: the stored order no longer matches, so
     grabValid below drops to null and the mission order renders. */
  const [grab, setGrab] = useState<{ id: string; order: string[] } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [collapsed, setCollapsed] = useState<string[]>([])
  const isCollapsed = (key: string) => collapsed.includes(key)
  const toggleCollapsed = (key: string) =>
    setCollapsed((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [editingAvoidId, setEditingAvoidId] = useState<string | null>(null)
  const [areaDraft, setAreaDraft] = useState<MissionArea | null>(null)
  const [avoidDraft, setAvoidDraft] = useState<AvoidZone | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [reconTarget, setReconTarget] = useState<{ kind: 'route' | 'area'; id: string } | null>(null)
  const [reconDraft, setReconDraft] = useState<ReconFlightSettings>(DEFAULT_RECON_FLIGHT_SETTINGS)
  const missionIds = mission.waypoints.map((w) => w.id)
  const grabValid = grab !== null
    && grab.order.length === missionIds.length
    && grab.order.every((id) => missionIds.includes(id))
    ? grab : null
  const orderedWaypoints = grabValid
    ? grabValid.order.flatMap((id) => mission.waypoints.find((w) => w.id === id) ?? [])
    : mission.waypoints

  const defaultRecon = (enabled = false): ReconFlightSettings => ({ ...DEFAULT_RECON_FLIGHT_SETTINGS, enabled })
  const routeRecon = (routeId: string) => mission.routes?.find((route) => route.id === routeId)?.reconnaissance ?? defaultRecon(false)
  const areaRecon = (areaId: string) => mission.areas.find((area) => area.id === areaId)?.reconnaissance ?? defaultRecon(true)
  const openReconSettings = (kind: 'route' | 'area', id: string, value: ReconFlightSettings) => {
    setReconDraft({ ...value })
    setReconTarget({ kind, id })
  }
  const updateReconDraft = (settings: ReconFlightSettings) => {
    setReconDraft(settings)
    if (!reconTarget) return
    if (reconTarget.kind === 'route') {
      onPreviewMission({ ...mission, routes: (mission.routes ?? []).map((route) => route.id === reconTarget.id ? { ...route, reconnaissance: settings } : route) })
    } else {
      onPreviewMission({ ...mission, areas: mission.areas.map((area) => area.id === reconTarget.id ? { ...area, reconnaissance: settings } : area) })
    }
  }
  const cancelReconSettings = () => {
    onCancelPreview()
    setReconTarget(null)
  }
  const commitReconSettings = () => {
    if (!reconTarget) return
    if (reconTarget.kind === 'route') {
      onCommitPreview({ ...mission, routes: (mission.routes ?? []).map((route) => route.id === reconTarget.id ? { ...route, reconnaissance: reconDraft } : route) }, 'Reconnaissance settings updated.')
    } else {
      onCommitPreview({ ...mission, areas: mission.areas.map((area) => area.id === reconTarget.id ? { ...area, reconnaissance: reconDraft } : area) }, 'Reconnaissance settings updated.')
    }
    setReconTarget(null)
  }
  useEffect(() => {
    if (worldType === '3D' && reconTarget) {
      onCancelPreview()
      setReconTarget(null)
    }
  }, [worldType, reconTarget, onCancelPreview])
  const updateActionPitch = (waypointId: string, actionId: string, value: number) => {
    const pitch = Math.min(0, Math.max(-90, value))
    onUpdateMission({
      ...mission,
      waypoints: mission.waypoints.map((waypoint) => waypoint.id !== waypointId ? waypoint : {
        ...waypoint,
        actions: waypoint.actions.map((action) => action.id === actionId ? { ...action, gimbalPitchDeg: pitch } : action)
      })
    }, 'Waypoint camera angle updated.')
  }
  const toggleRouteRecon = (routeId: string, recon: ReconFlightSettings) => {
    const enabled = !recon.enabled
    const routes = getMissionRoutes(mission)
    const firstRouteId = routes[0]?.id
    const waypoints = enabled
      ? mission.waypoints.map((waypoint) => {
        const belongsToRoute = !waypoint.generatedByArea && !waypoint.generatedByAvoid && (waypoint.routeId ?? firstRouteId) === routeId
        if (!belongsToRoute || waypoint.actions.some((action) => action.kind === 'photo')) return waypoint
        return { ...waypoint, actions: [...waypoint.actions, { id: uid('act'), kind: 'photo' as const, label: actionLabel('photo') }] }
      })
      : mission.waypoints
    onUpdateMission({
      ...mission,
      routes: (mission.routes ?? routes).map((item) => item.id === routeId ? { ...item, reconnaissance: { ...recon, enabled } } : item),
      waypoints
    }, `${routes.find((item) => item.id === routeId)?.label ?? 'Route'} reconnaissance ${enabled ? 'on' : 'off'}.`)
  }
  const mixedPitch = (waypoints: Waypoint[], fallback: number) => {
    const pitches = Array.from(new Set(waypoints.flatMap((waypoint) => waypoint.actions
      .filter((action) => action.kind === 'photo')
      .map((action) => action.gimbalPitchDeg ?? fallback))))
    return pitches.length > 1 ? 'Mixed' : `${(pitches[0] ?? fallback).toFixed(0)}°`
  }
  const captureSummary = (waypoints: Waypoint[], settings: ReconFlightSettings, pathLength: number, altitudeAgl = false) => {
    const captureCount = waypoints.reduce((sum, waypoint) => sum + waypoint.actions.filter((action) => action.kind === 'photo').length, 0)
    const minutes = Math.max(0, (pathLength / Math.max(0.5, settings.flightSpeedMS) + captureCount) / 60)
    const batteryPct = Math.min(99, Math.round(minutes / 27 * 100))
    const gsd = getMockReconGsdCmPerPx(settings.altitudeM)
    const estimateNote = `* Mock payload (17.3 mm sensor, 12.3 mm focal length, 5280 px) and fixed 27-minute battery. This segment estimate excludes Home launch, transfers, and return; Preview includes the full route at mock mission speed.${altitudeAgl ? ' Area AGL uses flat z=0; terrain is omitted.' : ''} Planning estimates only.`
    return (
      <div className='ms-recon-summary' aria-label='Capture summary'>
        <div><span>GSD estimate*</span><strong>{gsd.toFixed(1)} cm/px</strong></div>
        <div><span>{altitudeAgl ? 'Altitude AGL' : 'Altitude'}</span><strong>{settings.altitudeM} m</strong></div>
        <div><span>Front / Side overlap</span><strong>{settings.frontOverlapPct}% / {settings.sideOverlapPct}%</strong></div>
        <div><span>Gimbal pitch</span><strong>{mixedPitch(waypoints, settings.gimbalPitchDeg)}</strong></div>
        <div><span>Segment estimate</span><strong>{Math.ceil(minutes)} min</strong></div>
        <div><span>Battery segment*</span><strong>Spend {batteryPct}%</strong></div>
        <small>{estimateNote}</small>
      </div>
    )
  }

  const pickUpWaypoint = (id: string) => {
    if (grabValid && grabValid.id !== id) return
    const wp = mission.waypoints.find((w) => w.id === id)
    setGrab({ id, order: mission.waypoints.map((w) => w.id) })
    onAnnounce(`Waypoint ${wp?.seq ?? ''} picked up. Use ArrowUp and ArrowDown to reorder, Space to drop, Escape to cancel.`)
  }

  const previewMoveWaypoint = (id: string, dir: -1 | 1) => {
    const g = grabValid
    if (!g || g.id !== id) return
    const at = g.order.indexOf(id)
    const to = at + dir
    if (at < 0 || to < 0 || to >= g.order.length) return
    const order = [...g.order]
    const [moved] = order.splice(at, 1)
    order.splice(to, 0, moved)
    setGrab({ id, order })
    const wp = mission.waypoints.find((w) => w.id === id)
    onAnnounce(`Waypoint ${wp?.seq ?? ''} moved to position ${to + 1} of ${order.length}. Press Space to drop, Escape to cancel.`)
  }

  const dropPreviewWaypoint = (id: string) => {
    const g = grabValid
    const wp = mission.waypoints.find((w) => w.id === id)
    setGrab(null)
    if (!g || g.id !== id) return
    // Same id set, only the grabbed row moved: its preview index is the final
    // mission index, so this single reorder call reproduces the preview. When
    // the preview matches the mission order it is a no-op with no history.
    const toIndex = g.order.indexOf(id)
    onReorderWaypoint(id, toIndex)
    onAnnounce(`Waypoint ${wp?.seq ?? ''} dropped at position ${toIndex + 1} of ${g.order.length}.`)
  }

  const cancelPreviewWaypoint = (id: string) => {
    const g = grabValid
    setGrab(null)
    const wp = mission.waypoints.find((w) => w.id === id)
    if (!wp) {
      onAnnounce('Reorder cancelled.')
      return
    }
    const origIndex = mission.waypoints.findIndex((w) => w.id === id)
    const shownIndex = g && g.id === id ? g.order.indexOf(id) : origIndex
    if (shownIndex !== origIndex) {
      onAnnounce(`Reorder cancelled. Waypoint ${wp.seq} restored to position ${origIndex + 1} of ${mission.waypoints.length}.`)
    } else {
      onAnnounce('Reorder cancelled.')
    }
  }

  /* Reconnaissance settings as a nested inspector page: replaces the normal
     inspector content while reconTarget is set. Back discards the draft;
     Save commits it via commitReconSettings. */
  if (reconTarget !== null) {
    return (
      <div className={`ms-inspector${codeView ? ' ms-inspector-code' : ''}`} data-testid='ms-design-panel'>
        <section aria-label='Reconnaissance flight settings'>
          <div className='flex items-center gap-1 mb-1'>
            <Button size='icon-sm' variant='ghost' aria-label='Back to design' onClick={cancelReconSettings}>
              <ArrowLeftIcon aria-hidden='true' />
            </Button>
            <span className='ms-route-name'>{reconTarget.kind === 'area' ? 'Area reconnaissance settings' : 'Route reconnaissance settings'}</span>
          </div>
          <p className='ms-hint'>Configure this prototype capture plan. Terrain and camera metrics are estimates.</p>
          <ReconnaissanceSettingsForm
            value={reconDraft}
            onChange={updateReconDraft}
            showFlightPattern={reconTarget.kind === 'area'}
            altitudeReference={reconTarget.kind === 'area' ? 'AGL' : undefined}
          />
          <div className='ms-btnrow mt-8'>
            <Button size='sm' variant='outline' onClick={cancelReconSettings}>Cancel</Button>
            <Button size='sm' variant='default' onClick={commitReconSettings}>Save settings</Button>
          </div>
        </section>
        <p className='ms-foot-note'>Prototype mock — edits stay local, nothing is uploaded or flown.</p>
      </div>
    )
  }

  const routeCards = (editingAreaId !== null || editingAvoidId !== null ? [] : routes).map((route, routeIndex) => {
    const routeWaypoints = orderedWaypoints.filter((wp) =>
      !wp.generatedByArea && !wp.generatedByAvoid && (wp.routeId === route.id || (!wp.routeId && routeIndex === 0))
    )
    const routeLength = routeWaypoints.slice(1).reduce((sum, wp, index) => sum + dist3(routeWaypoints[index], wp), 0)
    const routeActions = routeWaypoints.reduce((sum, wp) => sum + wp.actions.length, 0)
    const speed = route.targetSpeedMS ?? mission.targetSpeedMS
    const recon = routeRecon(route.id)
    const speedRow = (
      <div className={worldType === '2D' ? 'ms-recon-control-row ms-target-speed-row' : 'ms-data-row'}>
        <span id={`ms-speed-label-${route.id}`}>Target speed</span>
        <span className='ms-data-right'>
          <CompactAxisField label={`${route.label} target speed in meters per second`} short='' value={speed} min={0.5} max={15} step={0.5} inputSize='xs'
            onChange={(v) => onUpdateMission({ ...mission, routes: routes.map((item) => item.id === route.id ? { ...item, targetSpeedMS: Math.min(15, Math.max(0.5, v)) } : item) })} />
          <span className='ms-unit' aria-hidden='true'>m/s</span>
          <Button
            size='icon-xs'
            variant='ghost'
            aria-label={`Reset ${route.label} target speed to mission default`}
            title='Reset to mission default speed'
            onClick={() => onUpdateMission({
              ...mission, routes: routes.map((item) => {
                if (item.id !== route.id) return item
                const { targetSpeedMS, ...rest } = item
                void targetSpeedMS
                return rest
              })
            }, `${route.label} target speed reset to mission default.`)}
          >
            <ArrowCounterClockwiseIcon aria-hidden='true' />
          </Button>
        </span>
      </div>
    )
    return {
      id: route.id, node: (
        <Fragment key={route.id}>
          <section className='ms-card ms-object-block' aria-label={`${route.label} sequence, ${routeWaypoints.length} waypoints, ${routeActions} actions`}>
            <div className='ms-route-head'>
              <div className='ms-route-title-group'>
                <PathIcon aria-hidden='true' className='ms-route-icon' />
                <span className='ms-route-name'>{route.label}</span>
              </div>
              <span className='ms-route-stats'>
                <span
                  className='ms-stat'
                  title='Waypoint-to-waypoint route length; excludes Home launch and return, transfers, and Area scan legs.'
                  aria-label={`Waypoint-to-waypoint route length ${routeLength.toFixed(1)} meters; excludes Home launch and return, transfers, and Area scan legs`}
                ><RulerIcon aria-hidden='true' />{routeLength.toFixed(1)} m</span>
                <span aria-hidden='true'>·</span>
                <span className='ms-stat'><GitMergeIcon aria-hidden='true' />{routeWaypoints.length}</span>
                <span aria-hidden='true'>·</span>
                <span className='ms-stat'><HandIcon aria-hidden='true' />{routeActions}</span>
              </span>
              <div className='ms-route-actions'>
                <Button
                  size='icon-sm'
                  variant='ghost'
                  aria-label={`Add waypoint to ${route.label}`}
                  onClick={() => onAddWaypoint(route.id)}
                >
                  <PlusIcon aria-hidden='true' />
                </Button>
                <Menu>
                  <MenuTrigger
                    aria-label={`More options for ${route.label}`}
                    className='border-0 bg-transparent p-0'
                    render={<Button variant='ghost' size='icon-sm' />}
                  >
                    <DotsThreeIcon aria-hidden='true' />
                  </MenuTrigger>
                  <MenuPortal>
                    <MenuPositioner side='bottom' align='end' sideOffset={4}>
                      <MenuPopup>
                        <MenuItem onClick={() => onDeleteRoute(route.id)}>
                          <TrashIcon aria-hidden='true' /> Delete route
                        </MenuItem>
                      </MenuPopup>
                    </MenuPositioner>
                  </MenuPortal>
                </Menu>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-expanded={!isCollapsed(`route:${route.id}`)}
                  aria-label={isCollapsed(`route:${route.id}`) ? `Expand ${route.label}` : `Collapse ${route.label}`}
                  data-testid={`ms-collapse-route-${routeIndex}`}
                  onClick={() => toggleCollapsed(`route:${route.id}`)}
                >
                  {isCollapsed(`route:${route.id}`) ? <CaretDownIcon aria-hidden='true' /> : <CaretUpIcon aria-hidden='true' />}
                </Button>
              </div>
            </div>
            {worldType === '2D' ? (
              <div className='ms-recon-control-group'>
                <div className='ms-recon-control-row'>
                  <span>Reconnaissance flight</span>
                  <Switch
                    checked={recon.enabled}
                    size='sm'
                    aria-label={`${route.label} reconnaissance flight`}
                    onCheckedChange={() => toggleRouteRecon(route.id, recon)}
                  ><SwitchThumb size='sm' /></Switch>
                  <Button variant='ghost' size='icon-sm' aria-label={`Reconnaissance settings for ${route.label}`} onClick={() => openReconSettings('route', route.id, recon)}>
                    <GearIcon aria-hidden='true' />
                  </Button>
                </div>
                {!isCollapsed(`route:${route.id}`) ? speedRow : null}
              </div>
            ) : null}
            {worldType === '2D' && recon.enabled ? (
              captureSummary(routeWaypoints, recon, routeLength)
            ) : null}
            {isCollapsed(`route:${route.id}`) ? null : (
              <>
                {worldType === '2D' ? null : speedRow}
                <ol className='ms-seq-list'>
                  <li className='ms-seq-row ms-seq-marker' aria-label={`Sequence start for ${route.label}`}>
                    <Badge count='START' status='outline' size='sm' className='ms-seq-static-accent' />
                    <span className='ms-seq-marker-label'>Drone active</span>
                  </li>
                  {routeWaypoints.map((wp) => {
                    const index = orderedWaypoints.findIndex((item) => item.id === wp.id)
                    return (
                      <Fragment key={wp.id}>
                        <WaypointRow
                          wp={wp}
                          index={index}
                          total={orderedWaypoints.length}
                          grabbed={grabValid?.id === wp.id}
                          mission={mission}
                          selected={selection?.kind === 'waypoint' && selection.id === wp.id}
                          onSelect={onSelect}
                          onUpdateMission={onUpdateMission}
                          onPickUpWaypoint={pickUpWaypoint}
                          onPreviewMoveWaypoint={previewMoveWaypoint}
                          onDropPreviewWaypoint={dropPreviewWaypoint}
                          onCancelPreviewWaypoint={cancelPreviewWaypoint}
                          onReorderWaypoint={onReorderWaypoint}
                          onDeleteWaypoint={onDeleteWaypoint}
                          onAnnounce={onAnnounce}
                        />
                        <ActionInsertAffordance
                          wpId={wp.id}
                          actionIndex={0}
                          wpSeq={wp.seq}
                          onInsertAction={onInsertActionAt}
                        />
                        {wp.actions.map((action, actionIndex) => (
                          <Fragment key={action.id}>
                            <SequenceActionRow
                              action={action}
                              wpId={wp.id}
                              wpSeq={wp.seq}
                              onDeleteAction={onDeleteAction}
                              inheritedPitch={routeRecon(route.id).gimbalPitchDeg}
                              onSetPitch={updateActionPitch}
                            />
                            <ActionInsertAffordance
                              wpId={wp.id}
                              actionIndex={actionIndex + 1}
                              wpSeq={wp.seq}
                              onInsertAction={onInsertActionAt}
                            />
                          </Fragment>
                        ))}
                      </Fragment>
                    )
                  })}
                  {transferItem(transferFrom('route', route.id))}
                </ol>
                {isFinalSequenceItem('route', route.id) && !transferFrom('route', route.id) ? endMissionControl() : null}
              </>
            )}
          </section>
        </Fragment>
      )
    }
  })

  const areaCards = mission.areas.filter((area) => editingAvoidId === null && (editingAreaId === null || editingAreaId === area.id)).map((area) => {
    const isEditing = editingAreaId === area.id
    const isFinalArea = isFinalSequenceItem('area', area.id)
    const draft = areaDraft?.id === area.id ? areaDraft : area
    const areaM2 = Math.round(polygonArea(area.points))
    const areaWp = mission.waypoints.filter((w) => w.generatedByArea === area.id)
    const areaActionCount = areaWp.reduce((sum, w) => sum + w.actions.length, 0)
    const recon = areaRecon(area.id)
    const areaSpacingM = getAreaScanSpacingM(area)
    const areaSpacingLabel = area.reconnaissance?.enabled ? areaSpacingM.toFixed(1) : String(areaSpacingM)
    const areaLength = areaWp.slice(1).reduce((sum, waypoint, index) => sum + dist3(areaWp[index], waypoint), 0)
    return {
      id: area.id, node: (
        <Fragment key={area.id}>
          <section className={`ms-card ms-object-block${isEditing ? ' is-editing' : ''}`} aria-label={area.label}>
            <div className='ms-route-head'>
              <div className='ms-route-title-group'>
                <AreaIcon aria-hidden='true' className='ms-route-icon' />
                <span className='ms-route-name'>{area.label}</span>
              </div>
              <span className='ms-route-stats'>
                <span className='ms-stat'><RulerIcon aria-hidden='true' />{areaM2 > 0 ? `${areaM2} m²` : `${area.points.length} pts`}</span>
                <span aria-hidden='true'>·</span>
                <span className='ms-stat'><GitMergeIcon aria-hidden='true' />{areaWp.length}</span>
                <span aria-hidden='true'>·</span>
                <span className='ms-stat'><HandIcon aria-hidden='true' />{areaActionCount}</span>
              </span>
              <div className='ms-route-actions'>
                <Menu>
                  <MenuTrigger
                    aria-label={`More options for ${area.label}`}
                    className='border-0 bg-transparent p-0'
                    render={<Button variant='ghost' size='icon-sm' />}
                  ><DotsThreeIcon aria-hidden='true' /></MenuTrigger>
                  <MenuPortal><MenuPositioner side='bottom' align='end' sideOffset={4}><MenuPopup>
                    <MenuItem onClick={() => {
                      if (editingAvoidId) onCancelPreview()
                      setEditingAvoidId(null)
                      setAvoidDraft(null)
                      onDetailEditStateChange(true)
                      setEditingAreaId(area.id)
                      setAreaDraft({
                        ...area,
                        lineSpacingM: area.lineSpacingM ?? 6,
                        orientationDeg: area.orientationDeg ?? 0,
                        paddingM: area.paddingM ?? 0
                      })
                    }}>Edit area</MenuItem>
                    <MenuItem onClick={() => onDeleteZone('area', area.id)}><TrashIcon aria-hidden='true' /> Delete area</MenuItem>
                  </MenuPopup></MenuPositioner></MenuPortal>
                </Menu>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-expanded={!isCollapsed(`area:${area.id}`)}
                  aria-label={isCollapsed(`area:${area.id}`) ? `Expand ${area.label}` : `Collapse ${area.label}`}
                  onClick={() => toggleCollapsed(`area:${area.id}`)}
                >
                  {isCollapsed(`area:${area.id}`) ? <CaretDownIcon aria-hidden='true' /> : <CaretUpIcon aria-hidden='true' />}
                </Button>
              </div>
            </div>
            {worldType === '2D' ? (
              <div className='ms-recon-control-group'>
                <div className='ms-recon-control-row'>
                  <span>Reconnaissance flight</span>
                  <Switch
                    checked={recon.enabled}
                    size='sm'
                    aria-label={`${area.label} reconnaissance flight`}
                    onCheckedChange={() => onUpdateMission({ ...mission, areas: mission.areas.map((item) => item.id === area.id ? { ...item, reconnaissance: { ...recon, enabled: !recon.enabled } } : item) }, `${area.label} reconnaissance ${recon.enabled ? 'off' : 'on'}.`)}
                  ><SwitchThumb size='sm' /></Switch>
                  <Button variant='ghost' size='icon-sm' aria-label={`Reconnaissance settings for ${area.label}`} onClick={() => openReconSettings('area', area.id, recon)}>
                    <GearIcon aria-hidden='true' />
                  </Button>
                </div>
              </div>
            ) : null}
            {worldType === '2D' && recon.enabled ? (
              <>
                {captureSummary(areaWp, recon, areaLength, true)}
                <p className='ms-hint'>
                  Photo spacing {getAreaPhotoSpacingM(area).toFixed(1)} m · lane spacing {getAreaScanSpacingM(area).toFixed(1)} m. Camera footprint uses a mock square FOV on flat ground; terrain is omitted and footprints disappear if any image corner faces the horizon.
                </p>
                <Accordion multiple className='ms-area-capture-list' aria-label={`${area.label} waypoint camera settings`}>
                  <AccordionItem value='camera-settings' className='border-b-0'>
                    <AccordionHeader>
                      <AccordionTrigger variant='compact'>Camera settings by waypoint ({areaWp.reduce((count, waypoint) => count + waypoint.actions.filter((action) => action.kind === 'photo').length, 0)})</AccordionTrigger>
                    </AccordionHeader>
                    <AccordionPanel>
                      <div className='ms-area-capture-rows'>
                        {areaWp.flatMap((waypoint) => waypoint.actions.filter((action) => action.kind === 'photo').map((action) => (
                          <label className='ms-area-capture-row' key={action.id}>
                            <span>Waypoint {waypoint.seq} · Take photo</span>
                            <span>Gimbal pitch</span>
                            <NumberField
                              value={action.gimbalPitchDeg ?? recon.gimbalPitchDeg}
                              min={-90}
                              max={0}
                              step={1}
                              onValueChange={(value) => { if (typeof value === 'number' && Number.isFinite(value)) updateActionPitch(waypoint.id, action.id, value) }}
                            >
                              <NumberFieldInput aria-label={`Gimbal pitch at waypoint ${waypoint.seq}`} />
                            </NumberField>
                            <span>°</span>
                          </label>
                        )))}
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </>
            ) : null}
            {isCollapsed(`area:${area.id}`) ? null : (
              <>
                {isEditing ? (
                  <form
                    className='ms-zone-settings'
                    aria-label={`${area.label} scan settings`}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        event.stopPropagation()
                        onCancelPreview()
                        setEditingAreaId(null)
                        setAreaDraft(null)
                        onDetailEditStateChange(false)
                      } else if (event.key === 'Enter') {
                        // Let text/number inputs submit natively; sliders do not trigger implicit
                        // form submission, so submit them explicitly exactly once.
                        event.stopPropagation()
                        if (event.target instanceof HTMLElement && event.target.getAttribute('role') === 'slider') {
                          event.preventDefault()
                          event.currentTarget.requestSubmit()
                        }
                      }
                    }}
                    onSubmit={(event) => {
                      event.preventDefault()
                      onCommitPreview({ ...mission, areas: mission.areas.map((item) => (item.id === area.id ? draft : item)) }, 'Area scan settings committed.')
                      setEditingAreaId(null)
                      setAreaDraft(null)
                      onDetailEditStateChange(false)
                    }}
                  >
                    {draft.reconnaissance?.enabled ? (
                      <p className='ms-hint'>
                        Lane spacing follows Side overlap ({getAreaScanSpacingM(draft).toFixed(1)} m) while Recon is on. Turn Recon off to edit manual line spacing.
                      </p>
                    ) : (
                      <SliderField
                        label='Line spacing (m)'
                        value={draft.lineSpacingM ?? 6}
                        min={0.25}
                        max={20}
                        step={0.25}
                        unit='m'
                        onChange={(v) => {
                          const nextDraft = { ...draft, lineSpacingM: v }
                          setAreaDraft(nextDraft)
                          onPreviewMission({ ...mission, areas: mission.areas.map((item) => item.id === area.id ? nextDraft : item) })
                        }}
                      />
                    )}
                    <SliderField
                      label='Orientation (°)'
                      value={draft.orientationDeg ?? 0}
                      min={-180}
                      max={180}
                      step={1}
                      unit='°'
                      onChange={(v) => {
                        const nextDraft = { ...draft, orientationDeg: v }
                        setAreaDraft(nextDraft)
                        onPreviewMission({ ...mission, areas: mission.areas.map((item) => item.id === area.id ? nextDraft : item) })
                      }}
                    />
                    <SliderField
                      label='Scan padding (m)'
                      value={draft.paddingM ?? 0}
                      min={0}
                      max={20}
                      step={0.5}
                      unit='m'
                      onChange={(v) => {
                        const nextDraft = { ...draft, paddingM: v }
                        setAreaDraft(nextDraft)
                        onPreviewMission({ ...mission, areas: mission.areas.map((item) => item.id === area.id ? nextDraft : item) })
                      }}
                    />
                    <div className='ms-btnrow'>
                      <Button type='button' size='sm' variant='outline' onClick={() => { onCancelPreview(); setEditingAreaId(null); setAreaDraft(null); onDetailEditStateChange(false) }}>Cancel</Button>
                      <Button type='submit' size='sm' variant='default'>Commit area</Button>
                    </div>
                  </form>
                ) : (
                  <p className='ms-hint pt-0!'>{(area.scanLines?.length ?? 0)} scan lanes · {areaSpacingLabel} m spacing · {area.orientationDeg ?? 0}°</p>
                )}
                {transferBox(transferFrom('area', area.id))}
                {isFinalArea && !transferFrom('area', area.id) ? endMissionControl() : null}
              </>
            )}
          </section>
        </Fragment>
      )
    }
  })
  const visibleSequence = editingAreaId !== null
    ? [{ type: 'area' as const, id: editingAreaId }]
    : editingAvoidId !== null ? [] : missionSequence

  return (
    <div className={`ms-inspector${codeView ? ' ms-inspector-code' : ''}`} data-testid='ms-design-panel'>
      {/* Pane tabs: Design, Code and the photogrammetry route Preview. */}
      <div className='ms-pane-head'>
        <div className='ms-pane-tabs' data-testid='ms-pane-tabs'>
          <Tabs
            value={codeView ? 'code' : previewOpen ? 'preview' : 'visual'}
            onValueChange={(v: unknown) => {
              const value = String(v)
              setPreviewOpen(value === 'preview')
              onCodeViewChange(value === 'code')
            }}
            aria-label='Mission panel view'
            className='ms-pane-viewtabs'
          >
            <TabsList variant='filled'>
              <TabsTab value='visual'>Design</TabsTab>
              <TabsTab value='code' disabled={editingAreaId !== null || editingAvoidId !== null}>Code</TabsTab>
              <TabsTab value='preview' disabled={editingAreaId !== null || editingAvoidId !== null}>Preview</TabsTab>
              <TabsIndicator variant='pill' />
            </TabsList>
          </Tabs>
          {/* <span className='ms-pane-tabs-actions'>
          <Button
            size='icon-sm'
            variant='ghost'
            aria-label='Pane options (unavailable in prototype)'
            title='Pane options (unavailable in prototype)'
            onClick={() => onAnnounce('Pane options are a mock in this prototype.')}
          >
            <DotsThreeIcon aria-hidden='true' />
          </Button>
          <span className='ms-vdivider' aria-hidden='true' />
          <Button size='icon-sm' variant='ghost' aria-label='Collapse inspector panel' onClick={onCollapsePane}>
            <SidebarIcon aria-hidden='true' />
          </Button>
        </span> */}
        </div>
        {!codeView && !previewOpen && editingAreaId === null && editingAvoidId === null && (
          <section className='ms-card ms-settings' aria-label='Mission settings'>
            <div className='ms-settings-head'>
              <h3 className='ms-card-title'>Mission settings</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label='About mission settings'
                        size='icon-xs'
                        variant='ghost'
                        onClick={() => onAnnounce(missionSettingsTooltip)}
                      />
                    }
                  >
                    <QuestionIcon aria-hidden='true' />
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipPositioner side='bottom' sideOffset={8}>
                      <TooltipPopup>
                        <TooltipArrow />
                        {missionSettingsTooltip}
                      </TooltipPopup>
                    </TooltipPositioner>
                  </TooltipPortal>
                </Tooltip>
              </TooltipProvider>
              <span className='ms-settings-spacer' />
              <Button
                size='icon-xs'
                variant='ghost'
                aria-expanded={settingsOpen}
                aria-label={settingsOpen ? 'Collapse mission settings' : 'Expand mission settings'}
                data-testid='ms-settings-toggle'
                onClick={() => setSettingsOpen((v) => !v)}
              >
                {settingsOpen ? <CaretUpIcon aria-hidden='true' /> : <CaretDownIcon aria-hidden='true' />}
              </Button>
            </div>
            {settingsOpen ? (
              <>
                <div className='ms-data-row'>
                  <span id='ms-takeoff-label'>Take-off altitude</span>
                  <Select<string>
                    items={Array.from(new Set([mission.takeoffAltM, 2, 5, 10, 12, 15, 20, 30]))
                      .sort((a, b) => a - b)
                      .map((v) => ({ value: String(v), label: v.toFixed(2) }))}
                    value={String(mission.takeoffAltM)}
                    onValueChange={(v: unknown) => {
                      const next = Number(v)
                      if (!Number.isFinite(next) || next < 0 || next === mission.takeoffAltM) return
                      onUpdateMission(
                        { ...mission, takeoffAltM: Math.round(next * 100) / 100 },
                        `Take-off altitude set to ${next.toFixed(2)} m.`
                      )
                    }}
                  >
                    <SelectTrigger aria-labelledby='ms-takeoff-label' data-testid='ms-takeoff-select' className='ms-data-select'>
                      <SelectValue />
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner side='bottom' align='end' sideOffset={4}>
                        <SelectPopup>
                          <SelectList>
                            {Array.from(new Set([mission.takeoffAltM, 2, 5, 10, 12, 15, 20, 30]))
                              .sort((a, b) => a - b)
                              .map((v) => (
                                <SelectItem key={v} value={String(v)}>
                                  <SelectItemIndicator />
                                  <SelectItemText>{v.toFixed(2)}</SelectItemText>
                                </SelectItem>
                              ))}
                          </SelectList>
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                </div>
                <div className='ms-data-row'>
                  <span id='ms-safety-label'>Safety options</span>
                  <Select<string>
                    items={SAFETY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    value={safetyModeOf(mission)}
                    onValueChange={(v: unknown) => {
                      const mode = String(v) as SafetyMode
                      if (mode === safetyModeOf(mission)) return
                      if (mode !== 'obstacle' && mode !== 'privacy' && mode !== 'off') return
                      onUpdateMission({ ...mission, safetyMode: mode }, 'Safety options updated (local mock).')
                    }}
                  >
                    <SelectTrigger aria-labelledby='ms-safety-label' data-testid='ms-safety-select' className='ms-data-select'>
                      <SelectValue />
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner side='bottom' align='end' sideOffset={4}>
                        <SelectPopup>
                          <SelectList>
                            {SAFETY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                <SelectItemIndicator />
                                <SelectItemText>{o.label}</SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectList>
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                </div>
              </>
            ) : null}
          </section>
        )}
      </div>

      {codeView ? (
        <section className='ms-python-card' aria-label='Mission script'>
          <div className='ms-python-head'>
            <label htmlFor={codeLang === 'json' ? 'ms-json-editor' : 'ms-code-editor'}>{codeLang === 'json' ? 'Mission JSON' : 'Mission script'}</label>
            <div className='ms-python-actions'>
              <Button className='ms-python-ai' size='icon-xs' variant='ghost' disabled title='AI script assistance unavailable in this prototype' aria-label='AI script assistance unavailable in this prototype'>
                <BrainIcon aria-hidden='true' /><SparkleIcon aria-hidden='true' />
              </Button>
              <div role='group' aria-label='Code language'>
                <Button
                  size='sm'
                  variant={codeLang === 'python' ? 'default' : 'outline'}
                  aria-label='Show Python draft'
                  onClick={() => onCodeLangChange('python')}
                >
                  Python
                </Button>
                <Button
                  size='sm'
                  variant={codeLang === 'json' ? 'default' : 'outline'}
                  aria-label='Show Mission JSON'
                  onClick={() => onCodeLangChange('json')}
                >
                  JSON <CaretDownIcon aria-hidden='true' />
                </Button>
              </div>
            </div>
          </div>
          {codeLang === 'json' ? (
            <>
              <textarea
                id='ms-json-editor'
                className='ms-code'
                aria-label='Mission JSON draft'
                aria-describedby='ms-json-hint'
                aria-invalid={jsonError ? true : undefined}
                value={jsonDraft}
                onChange={(event) => onJsonDraftChange(event.target.value)}
                spellCheck={false}
                rows={18}
              />
              {jsonError ? (
                <p className='ms-issue is-error' role='alert' id='ms-json-error'>{jsonError}</p>
              ) : null}
              <div className='ms-btnrow'>
                <Button size='sm' variant='outline' onClick={onExportJson} aria-label='Refresh Mission JSON from current mission'>
                  Refresh from mission
                </Button>
                <Button size='sm' variant='default' onClick={onApplyJson} aria-label='Apply Mission JSON to visual mission'>
                  Apply JSON
                </Button>
              </div>
              <p className='ms-python-limit' id='ms-json-hint'>Mission JSON round-trips the visual mission, including generated Area/Avoid provenance. Applying valid JSON updates the visual route and can be undone. Invalid JSON leaves the mission unchanged.</p>
            </>
          ) : (
            <>
              <PythonEditor value={codeDraft} onChange={onCodeDraftChange} />
              <p className='ms-python-limit' id='ms-code-limit'>Local draft only. Python does not execute or update the visual route. Mission save does not include this draft.</p>
            </>
          )}
        </section>
      ) : previewOpen ? (
        <MissionPreview
          mission={mission}
          onSelectWaypoint={(id) => onSelect({ kind: 'waypoint', id })}
          previewPositionRef={previewPositionRef}
          previewCaptureRef={previewCaptureRef}
        />
      ) : (
        <>
          {/* {editingAreaId === null && editingAvoidId === null && routes.length === 0 ? (
            <section className='ms-card ms-empty' aria-label='Empty mission'>
              <h3 className='ms-empty-title'>{mission.areas.length > 0 ? 'Area mission ready' : 'Start with a mission'}</h3>
              <p className='ms-hint'>
                {mission.areas.length > 0
                  ? 'Your Area scan is ready. Add a Route from the map tools or add its first waypoint here.'
                  : 'Choose Route or Area from the map tools, or add the first waypoint here.'}
              </p>
              <div className='ms-btnrow'><Button size='sm' variant='default' onClick={() => onAddWaypoint()}><PlusIcon aria-hidden='true' /> Add first waypoint</Button></div>
            </section>
          ) : null} */}

          <div className='ms-sequence-blocks' data-testid='ms-sequence-blocks'>
            {visibleSequence.map((item) => item.type === 'route'
              ? routeCards.find((card) => card.id === item.id)?.node ?? null
              : areaCards.find((card) => card.id === item.id)?.node ?? null)}

          </div>

          {/* {editingAreaId === null && editingAvoidId === null ? <div className='ms-zone-actions'>
            <Button size='sm' variant='outline' onClick={() => onAddZone('area')}><PlusIcon aria-hidden='true' /> Add Area</Button>
            <Button size='sm' variant='outline' onClick={() => onAddZone('avoid')}><PlusIcon aria-hidden='true' /> Add Avoid zone</Button>
          </div> : null} */}

          {mission.avoids.filter((zone) => editingAreaId === null && (editingAvoidId === null || editingAvoidId === zone.id)).map((zone) => {
            const isEditing = editingAvoidId === zone.id
            const draft = avoidDraft?.id === zone.id ? avoidDraft : zone
            return (
              <section className={`ms-card ms-object-block${isEditing ? ' is-editing' : ''}`} key={zone.id} aria-label={zone.label}>
                <div className='ms-route-head'>
                  <div className='ms-route-title-group'>
                    <AvoidZoneIcon aria-hidden='true' className='ms-route-icon' />
                    <span className='ms-route-name'>{zone.label}</span>
                  </div>
                  <span className='ms-route-stats'><Badge count={zone.type === 'privacy' ? 'People / Privacy' : 'Obstacle'} status='secondary' size='sm' /></span>
                  <div className='ms-route-actions'>
                    <Menu>
                      <MenuTrigger
                        aria-label={`More options for ${zone.label}`}
                        className='border-0 bg-transparent p-0'
                        render={<Button variant='ghost' size='icon-sm' />}
                      ><DotsThreeIcon aria-hidden='true' /></MenuTrigger>
                      <MenuPortal><MenuPositioner side='bottom' align='end' sideOffset={4}><MenuPopup>
                        <MenuItem onClick={() => {
                          if (editingAreaId) onCancelPreview()
                          setEditingAreaId(null)
                          setAreaDraft(null)
                          onDetailEditStateChange(true)
                          setEditingAvoidId(zone.id)
                          setAvoidDraft({
                            ...zone,
                            type: zone.type ?? 'obstacle',
                            heightM: zone.heightM ?? 15,
                            clearanceM: zone.clearanceM ?? 2
                          })
                        }}>Edit zone</MenuItem>
                        <MenuItem onClick={() => onDeleteZone('avoid', zone.id)}><TrashIcon aria-hidden='true' /> Delete zone</MenuItem>
                      </MenuPopup></MenuPositioner></MenuPortal>
                    </Menu>
                  </div>
                </div>
                {isEditing ? (
                  <form
                    className='ms-zone-settings'
                    aria-label={`${zone.label} settings`}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        event.stopPropagation()
                        onCancelPreview()
                        setEditingAvoidId(null)
                        setAvoidDraft(null)
                        onDetailEditStateChange(false)
                      } else if (event.key === 'Enter') {
                        // Let text/number inputs submit natively; sliders do not trigger implicit
                        // form submission, so submit them explicitly exactly once.
                        event.stopPropagation()
                        if (event.target instanceof HTMLElement && event.target.getAttribute('role') === 'slider') {
                          event.preventDefault()
                          event.currentTarget.requestSubmit()
                        }
                      }
                    }}
                    onSubmit={(event) => {
                      event.preventDefault()
                      onCommitPreview({ ...mission, avoids: mission.avoids.map((item) => (item.id === zone.id ? draft : item)) }, 'Avoid zone updated.')
                      setEditingAvoidId(null)
                      setAvoidDraft(null)
                      onDetailEditStateChange(false)
                    }}
                  >
                    <p className='ms-hint'>Choose whether this is a static physical obstacle or a people/privacy exclusion zone.</p>
                    <ToggleGroup
                      value={[draft.type ?? 'obstacle']}
                      variant='segmented'
                      size='xs'
                      aria-label={`${zone.label} type`}
                      className='ms-avoid-type-toggle'
                      onValueChange={(values) => {
                        const value = values[0]
                        if (value === 'obstacle' || value === 'privacy') {
                          const nextDraft: AvoidZone = { ...draft, type: value }
                          setAvoidDraft(nextDraft)
                          onPreviewMission({ ...mission, avoids: mission.avoids.map((item) => item.id === zone.id ? nextDraft : item) })
                        }
                      }}
                    >
                      <Toggle value='obstacle'>Obstacle</Toggle>
                      <Toggle value='privacy'>People / Privacy</Toggle>
                    </ToggleGroup>
                    <SliderField
                      label='Zone height (m)'
                      value={draft.heightM ?? 15}
                      min={1}
                      max={150}
                      step={0.5}
                      unit='m'
                      onChange={(v) => {
                        const nextDraft = { ...draft, heightM: Math.max(1, v) }
                        setAvoidDraft(nextDraft)
                        onPreviewMission({ ...mission, avoids: mission.avoids.map((item) => item.id === zone.id ? nextDraft : item) })
                      }}
                    />
                    <SliderField
                      label='Flight clearance (m)'
                      value={draft.clearanceM ?? 2}
                      min={0}
                      max={50}
                      step={0.5}
                      unit='m'
                      onChange={(v) => {
                        const nextDraft = { ...draft, clearanceM: Math.max(0, v) }
                        setAvoidDraft(nextDraft)
                        onPreviewMission({ ...mission, avoids: mission.avoids.map((item) => item.id === zone.id ? nextDraft : item) })
                      }}
                    />
                    <div className='ms-btnrow'>
                      <Button type='button' size='sm' variant='outline' onClick={() => { onCancelPreview(); setEditingAvoidId(null); setAvoidDraft(null); onDetailEditStateChange(false) }}>Cancel</Button>
                      <Button type='submit' size='sm' variant='default'>Submit zone</Button>
                    </div>
                  </form>
                ) : (
                  <p className='ms-hint'>Height {(zone.heightM ?? 15).toFixed(1)} m · Clearance {(zone.clearanceM ?? 2).toFixed(1)} m</p>
                )}
              </section>
            )
          })}

          {editingAreaId === null && editingAvoidId === null ? <section className='ms-card' aria-label='Validation'>
            <h3 className='ms-card-title'>Checks</h3>
            {issues.length === 0 ? (
              <p className='ms-issue is-ok' role='status'>Valid mission — Simulation is available.</p>
            ) : (
              <ul className='ms-issue-list'>
                {errors.map((i) => (
                  <li key={i.id} className='ms-issue is-error' role='alert'>{i.message}</li>
                ))}
                {warnings.map((i) => (
                  <li key={i.id} className='ms-issue is-warning' role='status'>{i.message}</li>
                ))}
              </ul>
            )}
          </section> : null}
        </>
      )}
      <p className='ms-foot-note'>Prototype mock — edits stay local, nothing is uploaded or flown.</p>
    </div>
  )
}
