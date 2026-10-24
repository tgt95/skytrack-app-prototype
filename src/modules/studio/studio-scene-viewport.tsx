import type { ComponentProps, RefObject } from 'react'
import MissionScene, { type MissionSceneHandle } from '../scene/mission-scene'
import LidarPreview from '../scene/lidar-preview'
import { DrawingAltitudeRuler } from '../design/design-controls'
import type { MissionBasemapStyle } from '../scene/basemaps'
import type { StudioMission } from '../../domain/mission-model'
import type { SimPlan } from '../simulation/simulation'
import type { useAddressSearch } from '../search/use-address-search'
import { MissionContextCards, StudioMapControls, type DroneChoice } from './studio-map-controls'

type SceneProps = Omit<ComponentProps<typeof MissionScene>, 'ref'>

interface StudioSceneViewportProps {
  mission: StudioMission
  sceneRef: RefObject<MissionSceneHandle | null>
  sceneProps: SceneProps
  editModeActive: boolean
  drawing: boolean
  stageIsDesign: boolean
  toolIsArea: boolean
  simActive: boolean
  lidarOn: boolean
  plan: SimPlan | null
  simClockRef: { current: number }
  reducedMotion: boolean
  drawingAltM: number
  onDrawingAltitudeCommit: (altitudeM: number) => void
  onAnnounce: (message: string) => void
  droneChoices: DroneChoice[]
  selectedDroneValue: string
  onSelectVehicle: (droneId: string, label: string) => void
  onOpenWorldPicker: () => void
  addressSearch: ReturnType<typeof useAddressSearch>
  stage: 'design' | 'simulation'
  showPhotoMarkers: boolean
  onShowPhotoMarkersChange: (show: boolean) => void
  showCameraFootprint: boolean
  onShowCameraFootprintChange: (show: boolean) => void
  footprintOpacity: number
  onFootprintOpacityChange: (opacity: number) => void
  basemapStyle: MissionBasemapStyle
  onBasemapStyleChange: (style: MissionBasemapStyle) => void
}

export default function StudioSceneViewport({
  mission,
  sceneRef,
  sceneProps,
  editModeActive,
  drawing,
  stageIsDesign,
  toolIsArea,
  simActive,
  lidarOn,
  plan,
  simClockRef,
  reducedMotion,
  drawingAltM,
  onDrawingAltitudeCommit,
  onAnnounce,
  droneChoices,
  selectedDroneValue,
  onSelectVehicle,
  onOpenWorldPicker,
  addressSearch,
  stage,
  showPhotoMarkers,
  onShowPhotoMarkersChange,
  showCameraFootprint,
  onShowCameraFootprintChange,
  footprintOpacity,
  onFootprintOpacityChange,
  basemapStyle,
  onBasemapStyleChange
}: StudioSceneViewportProps) {
  return (
    <div className={`ms-scene-wrap${drawing && stageIsDesign ? ' has-alt-ruler' : ''}${editModeActive ? ' is-editing-mode' : ''}`}>
      {!editModeActive ? (
        <div className='ms-map-overlays'>
          <MissionContextCards
            mission={mission}
            droneChoices={droneChoices}
            selectedDroneValue={selectedDroneValue}
            onSelectVehicle={onSelectVehicle}
            onOpenWorldPicker={onOpenWorldPicker}
          />
        </div>
      ) : null}
      <div className='ms-3d-layer'>
        {mission.worldType !== '2D' && mission.origin?.attribution ? (
          <a className='ms-geocoded-origin-credit' href={mission.origin.attribution.href} target='_blank' rel='noreferrer' aria-label={`Geocoded origin attribution: ${mission.origin.attribution.label}`}>
            {mission.origin.attribution.label}
          </a>
        ) : null}
        <MissionScene ref={sceneRef} {...sceneProps} />
      </div>
      {simActive && lidarOn && plan ? <LidarPreview plan={plan} clockRef={simClockRef} reducedMotion={reducedMotion} /> : null}
      {drawing && stageIsDesign && !toolIsArea ? (
        <DrawingAltitudeRuler value={drawingAltM} onCommit={onDrawingAltitudeCommit} onAnnounce={onAnnounce} />
      ) : null}
      <StudioMapControls
        worldType={mission.worldType}
        worldName={mission.world}
        sceneRef={sceneRef}
        addressSearch={addressSearch}
        onAnnounce={onAnnounce}
        stageIsDesign={stage === 'design'}
        showPhotoMarkers={showPhotoMarkers}
        onShowPhotoMarkersChange={onShowPhotoMarkersChange}
        showCameraFootprint={showCameraFootprint}
        onShowCameraFootprintChange={onShowCameraFootprintChange}
        footprintOpacity={footprintOpacity}
        onFootprintOpacityChange={onFootprintOpacityChange}
        basemapStyle={basemapStyle}
        onBasemapStyleChange={onBasemapStyleChange}
      />
    </div>
  )
}
