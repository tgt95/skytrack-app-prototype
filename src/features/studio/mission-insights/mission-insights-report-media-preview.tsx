import { LaptopIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Alert, AlertDescription } from 'skytrack-ui/alert'
import { Button } from 'skytrack-ui/button'
import { FieldLabel, FieldRoot } from 'skytrack-ui/field'
import { Switch, SwitchThumb } from 'skytrack-ui/switch'
import type { MissionInsightsReportTab } from '@/features/studio/mission-report-url'
import type { InsightMedia, JsonRecord } from './mission-insights-report-data'
import {
  asRecord,
  numberValue,
  textValue
} from './mission-insights-report-data'
import { coordinatePairs } from './mission-insights-report-flight-path'
import { SurveyContactSheetFrame } from './mission-insights-report-shared'

export function MediaPreview ({
  selected,
  overlayVisible,
  setOverlayVisible,
  detectionObjects,
  failedInvocation,
  onNavigate
}: {
  selected: InsightMedia
  overlayVisible: boolean
  setOverlayVisible: (visible: boolean) => void
  detectionObjects: JsonRecord[]
  failedInvocation: boolean
  onNavigate: (tab: MissionInsightsReportTab) => void
}) {
  return (
    <section
      className='flex min-w-0 flex-col gap-3'
      aria-label={`${selected.name} preview`}
    >
      <header className='flex min-w-0 flex-wrap items-center justify-between gap-3'>
        <div className='h6'>{selected.name}</div>
        {selected.detectionCount > 0 && selected.kind === 'image' ? (
          <FieldRoot className='flex items-center gap-2'>
            <Switch
              checked={overlayVisible}
              onCheckedChange={setOverlayVisible}
              aria-label='Show detection overlay'
            >
              <SwitchThumb />
            </Switch>
            <FieldLabel>Show detections</FieldLabel>
          </FieldRoot>
        ) : null}
      </header>
      {selected.imageUrl && selected.kind === 'image' ? (
        <figure className='relative m-0 aspect-video min-w-0 overflow-hidden rounded-(--radius) border border-border bg-(--muted)'>
          {selected.syntheticPreview &&
          selected.previewFrameIndex !== undefined ? (
            <SurveyContactSheetFrame
              src={selected.imageUrl}
              frameIndex={selected.previewFrameIndex}
              alt={
                selected.previewAlt ??
                `Generated survey preview ${selected.name}`
              }
              className='size-full'
            />
          ) : (
            <img
              src={selected.imageUrl}
              alt={`Selected drone image ${selected.name}`}
              className='size-full object-contain'
            />
          )}
          {!selected.syntheticPreview &&
          overlayVisible &&
          detectionObjects.length ? (
            <svg
              className='absolute inset-0 size-full'
              viewBox='0 0 1 1'
              preserveAspectRatio='none'
              role='img'
              aria-label={`${detectionObjects.length} detection regions`}
            >
              {detectionObjects.map((item, index) => {
                const polygon = coordinatePairs(item.polygon)
                if (polygon.length < 3) return null
                const points = polygon.map(([x, y]) => `${x},${y}`).join(' ')
                return (
                  <polygon
                    key={`${item.class}-${index}`}
                    points={points}
                    fill='var(--warning)'
                    fillOpacity='0.16'
                    stroke='var(--warning)'
                    strokeWidth='0.004'
                    vectorEffect='non-scaling-stroke'
                  >
                    <title>
                      {textValue(item.class)} detection ·{' '}
                      {numberValue(item.confidence)?.toFixed(2) ?? '—'}
                    </title>
                  </polygon>
                )
              })}
            </svg>
          ) : null}
          <figcaption
            className={
              selected.syntheticPreview
                ? 'm-0 p-2 text-muted-foreground'
                : 'sr-only'
            }
          >
            {selected.syntheticPreview
              ? 'Leeville survey preview'
              : `Capture, ${selected.width ?? '—'} by ${
                  selected.height ?? '—'
                } pixels.`}
          </figcaption>
        </figure>
      ) : selected.imageUrl && selected.kind === 'video' ? (
        <figure className='m-0 flex min-w-0 flex-col gap-3'>
          <div className='relative aspect-video overflow-hidden rounded-(--radius) border border-border bg-(--muted)'>
            <img
              src={selected.imageUrl}
              alt={`${selected.name} video poster`}
              className='size-full object-cover'
            />
          </div>
          {asRecord(selected.artifact.metadata).truncated ? (
            <Alert variant='warning'>
              <AlertDescription>Recording is truncated.</AlertDescription>
            </Alert>
          ) : null}
        </figure>
      ) : (
        <Alert
          variant={
            selected.availability === 'missing' ? 'destructive' : 'warning'
          }
          role='status'
        >
          {selected.availability === 'remote_only' ? (
            <LaptopIcon className='size-5 shrink-0' aria-hidden='true' />
          ) : (
            <WarningCircleIcon className='size-5 shrink-0' aria-hidden='true' />
          )}
          <AlertDescription>
            {selected.availability === 'remote_only'
              ? 'Stored on the Mission Computer.'
              : selected.availability === 'missing'
              ? 'File not written.'
              : 'No local preview is available for this media record.'}
          </AlertDescription>
        </Alert>
      )}
      {failedInvocation ? (
        <Alert variant='destructive' role='status'>
          <WarningCircleIcon className='size-5 shrink-0' aria-hidden='true' />
          <AlertDescription>
            Model invocation failed for this capture.{' '}
            <Button
              variant='link'
              size='sm'
              onClick={() => onNavigate('ai-models')}
            >
              Review AI Models
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  )
}
