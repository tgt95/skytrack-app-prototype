import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { Card, CardContent } from 'skytrack-ui/card'
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator
} from 'skytrack-ui/toolbar'
import type { DroneGeometry } from '@/domain/drone-geometry'
import { DronePreview } from './preview/drone-preview'

function StatTile ({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex flex-col not-last:border-r not-last:border-border px-3 first:pl-0 last:pr-0'>
      <span className='text-sm text-muted-foreground'>{label}</span>
      <div className='h4 tabular-nums'>{value}</div>
    </div>
  )
}

export function DronePreviewPanel ({
  geometry,
  geometryValid,
  massKg,
  payloadMassKg,
  thrustRatio,
  view,
  setView,
  resetKey,
  setResetKey
}: {
  geometry: DroneGeometry
  geometryValid: boolean
  massKg: number
  payloadMassKg: number
  thrustRatio: number
  view: 'isometric' | 'top' | 'front'
  setView: (view: 'isometric' | 'top' | 'front') => void
  resetKey: number
  setResetKey: (update: (key: number) => number) => void
}) {
  return (
    <aside
      className='order-first min-w-0 xl:order-none xl:col-start-2 xl:row-start-1 xl:sticky xl:top-32 xl:self-start'
      aria-label='Live drone preview'
    >
      <Card as='section' className='p-0'>
        <CardContent className='flex flex-col'>
          <div className='relative aspect-video min-h-72 overflow-hidden rounded-(--radius) border-b border-border bg-muted'>
            <DronePreview
              profile={geometry}
              viewMode={view}
              resetKey={resetKey}
            />
            {!geometryValid && (
              <div
                className='absolute bottom-14 right-4 rounded-(--radius) border border-warning bg-background/90 px-2 py-1 text-sm text-warning'
                role='status'
              >
                Preview shows last valid geometry
              </div>
            )}
            <Toolbar
              aria-label='Drone preview controls'
              className='absolute top-2 right-2'
            >
              <ToolbarGroup aria-label='Preview view'>
                {(['isometric', 'top', 'front'] as const).map(preset => (
                  <ToolbarButton
                    key={preset}
                    type='button'
                    onClick={() => {
                      setView(preset)
                      setResetKey(key => key + 1)
                    }}
                  >
                    {preset === 'isometric'
                      ? 'Isometric'
                      : preset === 'top'
                      ? 'Top'
                      : 'Front'}
                  </ToolbarButton>
                ))}
              </ToolbarGroup>
              <ToolbarSeparator />
              <ToolbarGroup>
                <ToolbarButton
                  type='button'
                  size='icon'
                  aria-label='Reset view'
                  title='Reset view'
                  onClick={() => {
                    setView('isometric')
                    setResetKey(key => key + 1)
                  }}
                >
                  <ArrowCounterClockwiseIcon aria-hidden='true' />
                </ToolbarButton>
              </ToolbarGroup>
            </Toolbar>
          </div>
          {/* <div className='px-4 pt-2 text-x text-muted-foreground'>
            Drag to orbit · Shift/Command/Control-drag to pan · Alt-drag to
            adjust pitch · Scroll to zoom
          </div> */}
          <div className='flex flex-col gap-4 px-6 py-4'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <StatTile label='Total mass' value={`${massKg.toFixed(2)} kg`} />
              <StatTile
                label='Payload mass'
                value={`${payloadMassKg.toFixed(2)} kg`}
              />
              <StatTile
                label='Thrust / weight'
                value={`${thrustRatio.toFixed(2)}×`}
              />
              <StatTile
                label='Thrust reserve'
                value={`${Math.max(
                  0,
                  Math.min(100, (1 - 1 / thrustRatio) * 100)
                ).toFixed(0)}%`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}
