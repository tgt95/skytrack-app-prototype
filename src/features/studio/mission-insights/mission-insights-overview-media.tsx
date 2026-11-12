import { useState } from 'react'
import { Alert, AlertDescription } from 'skytrack-ui/alert'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { EyeIcon, ImageBrokenIcon, PackageIcon } from '@phosphor-icons/react'
import type { InsightMedia } from './mission-insights-report-data'
import { asRecord, sampleMedia } from './mission-insights-report-data'
import type { InsightOutput } from './mission-insights-output-data'
import type { MissionInsightSample } from './mission-insights-data'
import { DetailSection } from './mission-insights-page-sections'
import { Separator } from 'skytrack-ui/separator'

function analysisDetails (media: InsightMedia) {
  if (media.processingError) {
    return { message: `Analysis failed · ${media.processingError}` }
  }

  if (!media.detection) return { message: 'No linked detection record' }

  const software = asRecord(asRecord(media.detection.created_by).software)
  const modelName = [software.name, software.version]
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    )
    .join(' ')
  const countLabel = `${media.detectionCount} ${
    media.detectionCount === 1 ? 'detection' : 'detections'
  }`
  return {
    model: modelName || 'Model name not supplied',
    result: countLabel
  }
}

function availabilityBadge (value: string) {
  if (value === 'local') return { label: 'Local', status: 'success' as const }
  if (value === 'remote_only') {
    return { label: 'Mission Computer', status: 'secondary' as const }
  }
  if (value === 'missing') return { label: 'Missing', status: 'error' as const }
  return { label: 'Unknown', status: 'warning' as const }
}

function outputFileName (output: InsightOutput) {
  for (const section of output.details) {
    for (const [label, value] of section.rows) {
      if (label === 'Output file') return value
      if (/\.(geojson|txt|csv|json)$/i.test(label)) return label
    }
  }
  return null
}

export function MissionInsightsOverviewMedia ({
  sample,
  onOpenMedia,
  onOpenOutput
}: {
  sample: MissionInsightSample
  onOpenMedia: (id: string) => void
  onOpenOutput: (output: InsightOutput) => void
}) {
  const media = sampleMedia(sample)
  const imageCount = media.filter(item => item.kind === 'image').length
  const videoCount = media.filter(item => item.kind === 'video').length
  const reportedImageCount =
    sample.files.find(([name]) => name === 'Image')?.[1] ?? 0
  const relatedOutputs = sample.outputs
    .map(output => ({ output, fileName: outputFileName(output) }))
    .filter((item): item is { output: InsightOutput; fileName: string } =>
      Boolean(item.fileName)
    )
  const mediaCountLabel = media.length
    ? `${imageCount} images · ${videoCount} videos`
    : reportedImageCount > 0
    ? `${reportedImageCount} image files`
    : 'No media files'

  return (
    <DetailSection
      title='Media'
      toolbar={
        <>
          <Badge
            className='rounded-(--radius)'
            count={mediaCountLabel}
            status='secondary'
          />
          <Separator
            orientation='vertical'
            className='mx-1.5 h-auto self-stretch'
          />
          {media.length ? (
            <Button
              type='button'
              variant='link'
              size='sm'
              className='h-auto px-0'
              onClick={() => onOpenMedia(media[0].id)}
            >
              View all
            </Button>
          ) : null}
        </>
      }
    >
      {media.length ? (
        <div
          className='flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2'
          aria-label='Captured media previews'
        >
          {media.map(item => (
            <MediaRow
              key={item.id}
              media={item}
              onOpen={() => onOpenMedia(item.id)}
            />
          ))}
        </div>
      ) : (
        <Alert role='status'>
          <AlertDescription>
            {reportedImageCount > 0
              ? 'No per-file media records available.'
              : 'No captured media artifacts are recorded for this run.'}
          </AlertDescription>
        </Alert>
      )}

      {relatedOutputs.length ? (
        <section
          className='flex min-w-0 flex-col gap-2'
          aria-label='Related files'
        >
          <div className='text-sm sub-heading'>Related files</div>
          <ul className='m-0 flex list-none flex-col gap-2 p-0'>
            {relatedOutputs.map(({ output, fileName }) => (
              <li key={output.id} className='flex min-w-0 items-center gap-3'>
                <div className='min-w-0'>
                  <p className='m-0 truncate font-medium'>{fileName}</p>
                  <p className='m-0 text-sm text-muted-foreground'>
                    {output.summary}
                  </p>
                </div>
                <div className='ml-auto flex items-center gap-2'>
                  <Badge
                    className='shrink-0 rounded-(--radius)'
                    count={output.status}
                    status={
                      output.status === 'Available' ? 'success' : 'warning'
                    }
                  />
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => onOpenOutput(output)}
                  >
                    Details
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </DetailSection>
  )
}

function MediaRow ({
  media,
  onOpen
}: {
  media: InsightMedia
  onOpen: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [hasFocus, setHasFocus] = useState(false)
  const analysis = analysisDetails(media)
  const availability = availabilityBadge(media.availability)
  const availabilityClass =
    availability.status === 'success' || availability.status === 'secondary'
      ? 'bg-background/90'
      : ''
  return (
    <article
      className='group relative aspect-4/3 w-52 min-w-52 shrink-0 snap-start overflow-hidden rounded-(--radius) border border-border'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHasFocus(false)
        }
      }}
    >
      <div className='absolute inset-0 overflow-hidden bg-(--background)'>
        {media.imageUrl ? (
          <img
            src={media.imageUrl}
            alt={`${
              media.kind === 'video' ? 'Video poster' : 'Captured image'
            }: ${media.name}`}
            loading='lazy'
            className='size-full object-cover'
          />
        ) : (
          <div className='flex flex-col gap-1 size-full justify-center items-center bg-(--muted) text-center text-sm text-muted-foreground'>
            <ImageBrokenIcon className='size-6 text-muted-foreground' />
            Preview unavailable
          </div>
        )}
        <Badge
          className={`absolute left-1 top-1 z-0 rounded-(--radius) shadow-xs ${availabilityClass}`}
          size='sm'
          count={availability.label}
          status={availability.status}
          variant={
            availability.status === 'warning' || availability.status === 'error'
              ? 'default'
              : 'outline'
          }
        />
        <div className='absolute inset-0 z-10 flex translate-y-2 flex-col justify-end gap-2 bg-background/90 p-3 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100'>
          <p className='m-0 truncate font-medium' title={media.name}>
            {media.name}
          </p>
          <div className='min-h-10 text-sm'>
            {'message' in analysis ? (
              <p className='m-0 break-words'>{analysis.message}</p>
            ) : (
              <div className='flex flex-col gap-1'>
                <p className='m-0 flex min-w-0 items-center gap-2'>
                  <PackageIcon
                    className='size-4 shrink-0 text-muted-foreground'
                    aria-hidden='true'
                  />
                  <span className='truncate' title={analysis.model}>
                    {analysis.model}
                  </span>
                </p>
                <p className='m-0 flex items-center gap-2'>
                  <EyeIcon
                    className='size-4 shrink-0 text-muted-foreground'
                    aria-hidden='true'
                  />
                  <span>{analysis.result}</span>
                </p>
              </div>
            )}
          </div>
          <Button
            type='button'
            size='sm'
            variant='link'
            className='h-auto self-start px-0'
            onClick={onOpen}
          >
            Open media details
          </Button>
        </div>
      </div>
      {!isHovered && !hasFocus ? (
        <p
          className='absolute inset-x-0 bottom-0 z-10 m-0 truncate bg-black/60 px-2 py-1 font-medium text-white'
          title={media.name}
          aria-hidden='true'
        >
          {media.name}
        </p>
      ) : null}
    </article>
  )
}
