import {
  CaretRightIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import { Alert, AlertDescription } from 'skytrack-ui/alert'
import { Button } from 'skytrack-ui/button'
import type { InsightMedia } from './mission-insights-report-data'
import {
  asRecord,
  reportArtifacts,
  reportForSample,
  sampleMedia,
  textValue
} from './mission-insights-report-data'
import type { MissionInsightSample } from './mission-insights-data'
import { DetailSection } from './mission-insights-page-sections'

function mediaAvailability (media: InsightMedia[]) {
  const onDevice = media.filter(item => item.availability === 'local').length
  const onMissionComputer = media.filter(
    item => item.availability === 'remote_only'
  ).length
  const missing = media.filter(item => item.availability === 'missing').length
  const unknown = media.filter(item => item.availability === 'unknown').length
  const location = `${onDevice} on device\n${onMissionComputer} on Mission Computer`

  if (!media.length) {
    return {
      location,
      message: 'No media available',
      Icon: XCircleIcon,
      tone: 'muted' as const
    }
  }
  if (missing) {
    const missingMedia = media.find(item => item.availability === 'missing')
    return {
      location,
      message: `${missing} missing`,
      missingMediaId: missingMedia?.id,
      Icon: XCircleIcon,
      tone: 'muted' as const
    }
  }
  if (unknown) {
    return {
      location,
      message: `Availability unknown for ${unknown} ${
        unknown === 1 ? 'media item' : 'media items'
      }`,
      Icon: WarningCircleIcon,
      tone: 'warning' as const
    }
  }
  return {
    location,
    message: 'No error',
    Icon: CheckCircleIcon,
    tone: 'success' as const
  }
}

function otherFilesAvailability (sample: MissionInsightSample) {
  const otherFiles = reportArtifacts(reportForSample(sample)).filter(
    artifact => {
      const type = textValue(artifact.type, '')
      return type !== 'image' && type !== 'video'
    }
  )
  const total = otherFiles.length
  const onDevice = otherFiles.filter(
    artifact => textValue(asRecord(artifact.availability).state) === 'local'
  ).length
  const onMissionComputer = otherFiles.filter(
    artifact =>
      textValue(asRecord(artifact.availability).state) === 'remote_only'
  ).length
  const missing = otherFiles.filter(
    artifact => textValue(asRecord(artifact.availability).state) === 'missing'
  ).length
  const unknown = total - onDevice - onMissionComputer - missing
  const location =
    [
      onDevice ? `${onDevice} on device` : '',
      onMissionComputer ? `${onMissionComputer} on Mission Computer` : ''
    ]
      .filter(Boolean)
      .join(' · ') || 'No other files'

  if (!total) {
    return {
      total,
      location,
      message: 'No other files',
      Icon: XCircleIcon,
      tone: 'muted' as const
    }
  }
  if (missing) {
    return {
      total,
      location,
      message: `${missing} ${missing === 1 ? 'file is' : 'files are'} missing`,
      Icon: XCircleIcon,
      tone: 'muted' as const
    }
  }
  if (unknown) {
    return {
      total,
      location,
      message: `Availability not confirmed for ${unknown} ${
        unknown === 1 ? 'file' : 'files'
      }`,
      Icon: WarningCircleIcon,
      tone: 'warning' as const
    }
  }
  if (onMissionComputer) {
    return {
      total,
      location,
      message: `${onMissionComputer} ${
        onMissionComputer === 1 ? 'file isn’t' : 'files aren’t'
      } on this device`,
      Icon: XCircleIcon,
      tone: 'muted' as const
    }
  }
  return {
    total,
    location,
    message: 'No error',
    Icon: CheckCircleIcon,
    tone: 'success' as const
  }
}

type AvailabilityStatus = {
  location: string
  message: string
  missingMediaId?: string
  Icon: typeof CheckCircleIcon | typeof XCircleIcon | typeof WarningCircleIcon
  tone: 'success' | 'muted' | 'warning'
}

export function MissionInsightsOverviewOutputsFiles ({
  sample,
  onOpenMedia,
  onOpenMediaFiles,
  className = ''
}: {
  sample: MissionInsightSample
  onOpenMedia: (id: string) => void
  onOpenMediaFiles: () => void
  className?: string
}) {
  const media = sampleMedia(sample)
  const mediaStatus = mediaAvailability(media)
  const fileStatus = otherFilesAvailability(sample)

  return (
    <DetailSection
      title='Media & Files'
      className={className}
      toolbar={
        <Button
          type='button'
          size='sm'
          variant='link'
          className='px-0'
          onClick={onOpenMediaFiles}
        >
          View all
          <CaretRightIcon className='ml-1 size-4' aria-hidden='true' />
        </Button>
      }
    >
      {/* <div className='h-px w-full bg-border' /> */}
      <div className='grid min-w-0 min-h-0 h-full grid-cols-1 divide-y divide-border xl:grid-cols-2 xl:divide-x xl:divide-y-0'>
        <section
          className='flex min-w-0 flex-col gap-3 pb-5 xl:pr-6 xl:pb-0'
          aria-label='Media'
        >
          <div className='h6'>Media ({media.length})</div>
          {media.length ? (
            <div className='flex min-w-0 items-center justify-between gap-4 mt-auto'>
              <AvailabilitySummary
                status={mediaStatus}
                onClick={() =>
                  mediaStatus.missingMediaId
                    ? onOpenMedia(mediaStatus.missingMediaId)
                    : onOpenMediaFiles()
                }
              />
              {/* <div className='flex shrink-0 items-center gap-1' aria-label='Representative media items'>
                {media.slice(0, 3).map(item => (
                  <MediaRow key={item.id} media={item} onOpen={() => onOpenMedia(item.id)} />
                ))}
              </div> */}
            </div>
          ) : (
            <Alert role='status'>
              <AlertDescription>
                No captured media artifacts are recorded for this run.
              </AlertDescription>
            </Alert>
          )}
          {!media.length ? (
            <AvailabilitySummary
              status={mediaStatus}
              onClick={onOpenMediaFiles}
            />
          ) : null}
        </section>

        <section
          className='flex min-w-0 flex-col gap-3 pt-5 xl:pl-6 xl:pt-0'
          aria-label='Other files'
        >
          <div className='h6'>Other files ({fileStatus.total})</div>
          <div className='mt-auto'>
            <AvailabilitySummary
              status={fileStatus}
              onClick={onOpenMediaFiles}
            />
          </div>
        </section>
      </div>
    </DetailSection>
  )
}

function AvailabilitySummary ({
  status,
  onClick
}: {
  status: AvailabilityStatus
  onClick: () => void
}) {
  const Icon = status.Icon
  const statusTone =
    status.tone === 'success'
      ? 'text-success'
      : status.tone === 'warning'
      ? 'text-warning'
      : 'text-muted-foreground'
  const statusContent = (
    <span className='flex items-center gap-1.5 text-sm text-muted-foreground'>
      <Icon
        className={`size-4 shrink-0 ${statusTone}`}
        weight='fill'
        aria-hidden='true'
      />
      <span>{status.message}</span>
    </span>
  )

  return (
    <div className='flex min-w-0 flex-col items-start gap-2'>
      <span className='whitespace-pre-line text-sm text-foreground'>
        {status.location}
      </span>
      {status.tone === 'success' ? (
        statusContent
      ) : (
        <button
          type='button'
          className='flex cursor-pointer items-center gap-1 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          onClick={onClick}
          aria-label={`Open Media & Files: ${status.message}`}
        >
          {statusContent}
          <CaretRightIcon
            className='size-4 shrink-0 text-muted-foreground'
            aria-hidden='true'
          />
        </button>
      )}
    </div>
  )
}
