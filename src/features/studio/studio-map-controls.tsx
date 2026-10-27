import {
  CrosshairIcon,
  GearIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  StackIcon,
  XIcon
} from '@phosphor-icons/react'
import { CheckboxIndicator, CheckboxRoot } from 'skytrack-ui/checkbox'
import {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger
} from 'skytrack-ui/popover'
import { Button } from 'skytrack-ui/button'
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack
} from 'skytrack-ui/slider'
import { Toolbar, ToolbarButton, ToolbarSeparator } from 'skytrack-ui/toolbar'
import type { MissionSceneHandle } from '../scene/mission-scene'
import type { MissionBasemapStyle } from '../scene/basemaps'
import type { StudioMission } from '../../domain/mission-model'
import { SkyTooltip } from '../../ui/components/sky-tooltip'
import MapControlTooltip from '../../ui/components/map-control-tooltip'
import { BasemapPickerGrid } from './basemap-picker-grid'
import AddressSearchControls from '../search/address-search-controls'
import type { useAddressSearch } from '../search/use-address-search'

export { MissionContextCards } from './mission-context-cards'
export type { DroneChoice } from './mission-context-cards'

interface StudioMapControlsProps {
  worldType: StudioMission['worldType']
  worldName: string
  sceneRef: { current: MissionSceneHandle | null }
  addressSearch: ReturnType<typeof useAddressSearch>
  onAnnounce: (message: string) => void
  stageIsDesign: boolean
  showPhotoMarkers: boolean
  onShowPhotoMarkersChange: (show: boolean) => void
  showCameraFootprint: boolean
  onShowCameraFootprintChange: (show: boolean) => void
  footprintOpacity: number
  onFootprintOpacityChange: (opacity: number) => void
  basemapStyle: MissionBasemapStyle
  onBasemapStyleChange: (style: MissionBasemapStyle) => void
}

export function StudioMapControls ({
  worldType,
  worldName,
  sceneRef,
  addressSearch,
  onAnnounce,
  stageIsDesign,
  showPhotoMarkers,
  onShowPhotoMarkersChange,
  showCameraFootprint,
  onShowCameraFootprintChange,
  footprintOpacity,
  onFootprintOpacityChange,
  basemapStyle,
  onBasemapStyleChange
}: StudioMapControlsProps) {
  return (
    <div
      className=' [.ms-scene-wrap.has-alt-ruler_&]:right-8 absolute left-3 right-3 bottom-3 z-5 pointer-events-none flex flex-col items-end gap-2.5 *:pointer-events-auto'
      data-testid='ms-control-groups'
    >
      {worldType === '2D' ? (
        <AddressSearchControls
          controller={addressSearch}
          onAnnounce={onAnnounce}
        />
      ) : null}
      <Toolbar orientation='vertical' aria-label='Camera controls'>
        <MapControlTooltip
          label='Zoom in'
          trigger={
            <ToolbarButton
              type='button'
              size='icon'
              aria-label='Zoom in'
              onClick={() => sceneRef.current?.zoomBy(1)}
            />
          }
        >
          <MagnifyingGlassPlusIcon aria-hidden='true' />
        </MapControlTooltip>
        <MapControlTooltip
          label='Zoom out'
          trigger={
            <ToolbarButton
              type='button'
              size='icon'
              aria-label='Zoom out'
              onClick={() => sceneRef.current?.zoomBy(-1)}
            />
          }
        >
          <MagnifyingGlassMinusIcon aria-hidden='true' />
        </MapControlTooltip>
        <MapControlTooltip
          label='Reset camera'
          trigger={
            <ToolbarButton
              type='button'
              size='icon'
              aria-label='Reset camera'
              onClick={() => sceneRef.current?.resetCamera()}
            />
          }
        >
          <CrosshairIcon aria-hidden='true' />
        </MapControlTooltip>
        <ToolbarSeparator className='mx-0' />
        <MapControlTooltip
          label='Top-down 2D view'
          trigger={
            <ToolbarButton
              type='button'
              size='icon'
              aria-label='Top-down 2D view'
              onClick={() => {
                sceneRef.current?.snapTopDown()
                onAnnounce('Top-down 2D view.')
              }}
            />
          }
        >
          <span
            className=' text-xs font-bold tracking-[0.02em]'
            aria-hidden='true'
            data-testid='ms-2d-label'
          >
            2D
          </span>
        </MapControlTooltip>
      </Toolbar>
      {stageIsDesign ? (
        <Toolbar orientation='vertical' aria-label='Map settings'>
          <Popover>
            <MapControlTooltip
              label='Map display settings'
              trigger={
                <PopoverTrigger
                  aria-label='Map display settings'
                  data-testid='ms-map-gear-trigger'
                  render={
                    <ToolbarButton type='button' size='icon'>
                      <GearIcon aria-hidden='true' />
                    </ToolbarButton>
                  }
                />
              }
            />
            <PopoverPortal>
              <PopoverPositioner side='left' align='end' sideOffset={8}>
                <PopoverPopup
                  className='flex flex-col gap-4 w-64 max-h-[min(80vh,35rem)] overflow-y-auto p-4 border-(--border) border rounded-(--radius) bg-(--card) text-(--foreground)'
                  data-testid='ms-map-gear-popup'
                >
                  <PopoverArrow />
                  <div
                    className='h6 flex items-center justify-between'
                    data-testid='ms-basemap-heading'
                  >
                    Map display
                    <SkyTooltip>
                      <PopoverClose
                        render={
                          <Button
                            className='relative! top-0! right-0!'
                            size='icon-sm'
                            variant='ghost'
                            aria-label='Close basemap settings'
                            title='Close'
                          >
                            <XIcon aria-hidden='true' />
                          </Button>
                        }
                      />
                    </SkyTooltip>
                  </div>
                  <div className='grid grid-cols-1 gap-3'>
                    <label className='flex flex-row gap-2'>
                      <span className='py-0.5'>
                        <CheckboxRoot
                          checked={showPhotoMarkers}
                          onCheckedChange={checked =>
                            onShowPhotoMarkersChange(checked === true)
                          }
                          data-testid='ms-photo-markers-toggle'
                        >
                          <CheckboxIndicator aria-hidden='true'>
                            ✓
                          </CheckboxIndicator>
                        </CheckboxRoot>
                      </span>
                      <span className='text-sm'>Photo capture markers</span>
                    </label>
                    <div className='flex flex-col gap-2'>
                      <label className='flex flex-row gap-2'>
                        <span className='py-0.5'>
                          <CheckboxRoot
                            checked={showCameraFootprint}
                            onCheckedChange={checked =>
                              onShowCameraFootprintChange(checked === true)
                            }
                            data-testid='ms-camera-footprint-toggle'
                          >
                            <CheckboxIndicator aria-hidden='true'>
                              ✓
                            </CheckboxIndicator>
                          </CheckboxRoot>
                        </span>
                        <span className='text-sm'>
                          Camera capture footprint
                        </span>
                      </label>
                      {showCameraFootprint ? (
                        <div
                          className='flex flex-col gap-1 mt-0.5 mr-0 mb-0 ml-6.75 pt-0 px-0.5 pb-1.25'
                          data-testid='ms-footprint-opacity'
                        >
                          <div
                            className=' flex items-center justify-between mb-1.5 text-(--muted-foreground) text-xs font-semibold'
                            data-testid='ms-footprint-opacity-head'
                          >
                            <span>Footprint opacity</span>
                            <strong className='text-(--foreground) font-medium'>
                              {footprintOpacity}%
                            </strong>
                          </div>
                          <Slider
                            className='w-full'
                            value={footprintOpacity}
                            min={10}
                            max={80}
                            step={1}
                            onValueChange={(
                              value: number | readonly number[]
                            ) => {
                              const next = Array.isArray(value)
                                ? value[0]
                                : value
                              if (
                                typeof next === 'number' &&
                                Number.isFinite(next)
                              )
                                onFootprintOpacityChange(next)
                            }}
                          >
                            <SliderControl>
                              <SliderTrack>
                                <SliderIndicator />
                                <SliderThumb aria-label='Camera footprint opacity' />
                              </SliderTrack>
                            </SliderControl>
                          </Slider>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </PopoverPopup>
              </PopoverPositioner>
            </PopoverPortal>
          </Popover>
          {worldType === '2D' || worldName !== 'Blank space' ? (
            <Popover>
              <MapControlTooltip
                label='Basemap settings'
                trigger={
                  <PopoverTrigger
                    aria-label='Basemap settings'
                    data-testid='ms-basemap-trigger'
                    render={
                      <ToolbarButton type='button' size='icon'>
                        <StackIcon aria-hidden='true' />
                      </ToolbarButton>
                    }
                  />
                }
              />
              <PopoverPortal>
                <PopoverPositioner side='left' align='end' sideOffset={8}>
                  <PopoverPopup
                    className='flex flex-col gap-4 w-90 max-h-[min(80vh,35rem)] overflow-y-auto p-4 border border-(--border) rounded-(--radius) bg-(--card) text-(--foreground)'
                    data-testid='ms-basemap-popup'
                  >
                    <PopoverArrow />
                    <div
                      className='h6 flex items-center justify-between'
                      data-testid='ms-basemap-heading'
                    >
                      Basemap
                      <SkyTooltip>
                        <PopoverClose
                          render={
                            <Button
                              className='relative! top-0! right-0!'
                              size='icon-sm'
                              variant='ghost'
                              aria-label='Close basemap settings'
                              title='Close'
                            >
                              <XIcon aria-hidden='true' />
                            </Button>
                          }
                        />
                      </SkyTooltip>
                    </div>
                    <BasemapPickerGrid
                      value={basemapStyle}
                      onChange={onBasemapStyleChange}
                      testidPrefix='ms-basemap'
                    />
                  </PopoverPopup>
                </PopoverPositioner>
              </PopoverPortal>
            </Popover>
          ) : null}
        </Toolbar>
      ) : null}
    </div>
  )
}
