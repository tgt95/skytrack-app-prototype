/* design-panel.tsx — right inspector for the Design stage: route card,
   waypoint/END sequence, zones, validation, mission props, code view. */

import { memo, useState } from 'react'
import { Tabs, TabsIndicator, TabsList, TabsTab } from 'skytrack-ui/tabs'
import { type CameraActionKind, type SceneSelection, type StudioMission, type ValidationIssue } from '../../domain/mission-model'
import type { DerivedTransfer } from '../../domain/transfer-planner'
import MissionPreview from '../simulation/mission-preview'
import { ReconSettingsPage } from './reconnaissance-inspector'
import RouteSequenceCard from './route-sequence-card'
import AreaInspectorCard from './area-inspector-card'
import MissionSettingsCard, { MissionChecksCard } from './mission-settings-card'
import CodeInspectorPanel from './code-inspector-panel'
import AvoidInspectorCard from './avoid-inspector-card'
import type { SequenceDropPosition } from './sequence-controls'
import useDesignPanelState from './use-design-panel-state'
export { ZoneDraftPanel } from './zone-draft-panel'

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
  onMoveAction: (fromWpId: string, actionId: string, toWpId: string, toActionId?: string, position?: SequenceDropPosition) => void
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

function DesignPanel(props: DesignPanelProps) {
  const {
    mission,
    worldType,
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
    onDeleteRoute,
    onDeleteWaypoint,
    onReorderWaypoint,
    onMoveAction,
    onInsertActionAt,
    onDeleteAction,
    onDeleteZone,
    onAnnounce,
    previewPositionRef,
    previewCaptureRef
  } = props
  const missionSettingsTooltip = 'These settings are packaged into the mission file and sent to the drone. They govern how the drone executes the route autonomously in the field.'

  const {
    routes, missionSequence, isFinalSequenceItem, transferFrom,
    isCollapsed, toggleCollapsed,
    editingAreaId, setEditingAreaId, editingAvoidId, setEditingAvoidId,
    areaDraft, setAreaDraft, avoidDraft, setAvoidDraft,
    reconTarget, reconDraft, openReconSettings, updateReconDraft,
    cancelReconSettings, commitReconSettings, routeRecon, areaRecon,
    toggleRouteRecon, updateActionPitch,
    grabValid, orderedWaypoints, pickUpWaypoint, previewMoveWaypoint,
    dropPreviewWaypoint, cancelPreviewWaypoint
  } = useDesignPanelState(props)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)

  if (reconTarget !== null) {
    return (
      <ReconSettingsPage
        codeView={codeView}
        target={reconTarget}
        value={reconDraft}
        onChange={updateReconDraft}
        onBack={cancelReconSettings}
        onCancel={cancelReconSettings}
        onSave={commitReconSettings}
      />
    )
  }

  const routeCards = (editingAreaId !== null || editingAvoidId !== null ? [] : routes).map((route, routeIndex) => ({
    id: route.id,
    node: <RouteSequenceCard
      key={route.id}
      route={route}
      routeIndex={routeIndex}
      mission={mission}
      orderedWaypoints={orderedWaypoints}
      worldType={worldType}
      recon={routeRecon(route.id)}
      collapsed={isCollapsed(`route:${route.id}`)}
      grabbedWaypointId={grabValid?.id ?? null}
      selected={selection}
      transfer={transferFrom('route', route.id)}
      isFinalSequenceItem={isFinalSequenceItem('route', route.id)}
      onToggleCollapsed={() => toggleCollapsed(`route:${route.id}`)}
      onToggleRecon={() => toggleRouteRecon(route.id, routeRecon(route.id))}
      onOpenRecon={() => openReconSettings('route', route.id, routeRecon(route.id))}
      onUpdateMission={onUpdateMission}
      onDeleteRoute={onDeleteRoute}
      onInsertActionAt={onInsertActionAt}
      onSelect={onSelect}
      onPickUpWaypoint={pickUpWaypoint}
      onPreviewMoveWaypoint={previewMoveWaypoint}
      onDropPreviewWaypoint={dropPreviewWaypoint}
      onCancelPreviewWaypoint={cancelPreviewWaypoint}
      onReorderWaypoint={onReorderWaypoint}
      onMoveAction={onMoveAction}
      onDeleteWaypoint={onDeleteWaypoint}
      onDeleteAction={onDeleteAction}
      onSetActionPitch={updateActionPitch}
      onAnnounce={onAnnounce}
    />
  }))

  const areaCards = mission.areas
    .filter((area) => editingAvoidId === null && (editingAreaId === null || editingAreaId === area.id))
    .map((area) => ({
      id: area.id,
      node: <AreaInspectorCard
        key={area.id}
        area={area}
        mission={mission}
        worldType={worldType}
        recon={areaRecon(area.id)}
        draft={areaDraft?.id === area.id ? areaDraft : area}
        editing={editingAreaId === area.id}
        collapsed={isCollapsed(`area:${area.id}`)}
        isFinalSequenceItem={isFinalSequenceItem('area', area.id)}
        transfer={transferFrom('area', area.id)}
        onEdit={() => {
          if (editingAvoidId) onCancelPreview()
          setEditingAvoidId(null)
          setAvoidDraft(null)
          onDetailEditStateChange(true)
          setEditingAreaId(area.id)
          setAreaDraft({ ...area, lineSpacingM: area.lineSpacingM ?? 6, orientationDeg: area.orientationDeg ?? 0, paddingM: area.paddingM ?? 0 })
        }}
        onDelete={() => onDeleteZone('area', area.id)}
        onToggleCollapsed={() => toggleCollapsed(`area:${area.id}`)}
        onToggleRecon={() => onUpdateMission({
          ...mission,
          areas: mission.areas.map((item) => item.id === area.id ? { ...item, reconnaissance: { ...areaRecon(area.id), enabled: !areaRecon(area.id).enabled } } : item)
        }, `${area.label} reconnaissance ${areaRecon(area.id).enabled ? 'off' : 'on'}.`)}
        onOpenRecon={() => openReconSettings('area', area.id, areaRecon(area.id))}
        onUpdateMission={onUpdateMission}
        onSetActionPitch={updateActionPitch}
        onPreviewDraft={(nextDraft) => {
          setAreaDraft(nextDraft)
          onPreviewMission({ ...mission, areas: mission.areas.map((item) => item.id === area.id ? nextDraft : item) })
        }}
        onCancelEdit={() => {
          onCancelPreview()
          setEditingAreaId(null)
          setAreaDraft(null)
          onDetailEditStateChange(false)
        }}
        onCommitEdit={(nextDraft) => {
          onCommitPreview({ ...mission, areas: mission.areas.map((item) => item.id === area.id ? nextDraft : item) }, 'Area scan settings committed.')
          setEditingAreaId(null)
          setAreaDraft(null)
          onDetailEditStateChange(false)
        }}
      />
    }))

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
        </div>
        {!codeView && !previewOpen && editingAreaId === null && editingAvoidId === null && (
          <MissionSettingsCard mission={mission} open={settingsOpen} tooltip={missionSettingsTooltip} onOpenChange={setSettingsOpen} onUpdateMission={onUpdateMission} onAnnounce={onAnnounce} />
        )}
      </div>

      {codeView ? (
        <CodeInspectorPanel codeLang={codeLang} codeDraft={codeDraft} jsonDraft={jsonDraft} jsonError={jsonError} onCodeLangChange={onCodeLangChange} onCodeDraftChange={onCodeDraftChange} onJsonDraftChange={onJsonDraftChange} onApplyJson={onApplyJson} onExportJson={onExportJson} />
      ) : previewOpen ? (
        <MissionPreview
          mission={mission}
          onSelectWaypoint={(id) => onSelect({ kind: 'waypoint', id })}
          previewPositionRef={previewPositionRef}
          previewCaptureRef={previewCaptureRef}
        />
      ) : (
        <>


          <div className='ms-sequence-blocks' data-testid='ms-sequence-blocks'>
            {visibleSequence.map((item) => item.type === 'route'
              ? routeCards.find((card) => card.id === item.id)?.node ?? null
              : areaCards.find((card) => card.id === item.id)?.node ?? null)}

          </div>



          {mission.avoids.filter((zone) => editingAreaId === null && (editingAvoidId === null || editingAvoidId === zone.id)).map((zone) => (
            <AvoidInspectorCard
              key={zone.id}
              zone={zone}
              draft={avoidDraft?.id === zone.id ? avoidDraft : zone}
              editing={editingAvoidId === zone.id}
              onEdit={() => {
                if (editingAreaId) onCancelPreview()
                setEditingAreaId(null)
                setAreaDraft(null)
                onDetailEditStateChange(true)
                setEditingAvoidId(zone.id)
                setAvoidDraft({ ...zone, type: zone.type ?? 'obstacle', heightM: zone.heightM ?? 15, clearanceM: zone.clearanceM ?? 2 })
              }}
              onDelete={() => onDeleteZone('avoid', zone.id)}
              onPreviewDraft={(nextDraft) => {
                setAvoidDraft(nextDraft)
                onPreviewMission({ ...mission, avoids: mission.avoids.map((item) => item.id === zone.id ? nextDraft : item) })
              }}
              onCancelEdit={() => {
                onCancelPreview()
                setEditingAvoidId(null)
                setAvoidDraft(null)
                onDetailEditStateChange(false)
              }}
              onCommitEdit={(nextDraft) => {
                onCommitPreview({ ...mission, avoids: mission.avoids.map((item) => item.id === zone.id ? nextDraft : item) }, 'Avoid zone updated.')
                setEditingAvoidId(null)
                setAvoidDraft(null)
                onDetailEditStateChange(false)
              }}
            />
          ))}

          <MissionChecksCard issues={issues} hidden={editingAreaId !== null || editingAvoidId !== null} />
        </>
      )}
      <p className='ms-foot-note'>Prototype mock — edits stay local, nothing is uploaded or flown.</p>
    </div>
  )
}

export default memo(DesignPanel)
